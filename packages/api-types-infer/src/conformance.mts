/**
 * Walks each observed shape alongside the SDK type declared for it and turns
 * every mismatch into a finding. Mismatches the declaration already allows
 * (localized-key churn, integer vs float, absent optional fields, new values
 * of an open union) produce nothing.
 */
import {
  type InterfaceDeclaration,
  type Symbol as MorphSymbol,
  Node,
  type Type,
  ts,
} from 'ts-morph';
import type { Declarations } from '#src/declarations.mjs';
import {
  DISCRIMINANT_KEYS,
  isLocalized,
  primitiveType,
  variantShape,
} from '#src/emit.mjs';
import {
  type Element,
  type Kind,
  nonNullKinds,
  type ShapeNode,
} from '#src/shape.mjs';
import { declaredTypeFor } from '#src/specs.mjs';

export type FindingKind =
  | 'unexpected-null'
  | 'kind-mismatch'
  | 'unknown-literal'
  | 'new-literal'
  | 'missing-field'
  | 'required-but-absent'
  | 'unknown-variant'
  | 'unseen-field'
  | 'unresolved-type';

export const SEVERITY: Record<FindingKind, 'error' | 'info'> = {
  'unexpected-null': 'error',
  'kind-mismatch': 'error',
  'unknown-literal': 'error',
  'new-literal': 'info',
  'missing-field': 'error',
  'required-but-absent': 'error',
  'unknown-variant': 'error',
  'unseen-field': 'info',
  'unresolved-type': 'error',
};

/** Where a finding points in `src/types/`. */
export interface DeclarationRef {
  /** Interface (or type alias) name. */
  name: string;
  /** Path relative to the SDK package. */
  file: string;
  line: number;
  /** The field of `name` the finding is about. */
  property?: string;
  /** False for anonymous object types, which the codemod can't edit. */
  isInterface: boolean;
}

export interface Evidence {
  /** Kinds observed at the path, with counts. */
  kinds?: Partial<Record<Kind, number>>;
  /** Parent objects the field could have appeared in. */
  objects?: number;
  /** Parent objects that had the field. */
  present?: number;
  /** Raw samples with a parent object. */
  samples?: number;
  /** Independent raw samples in which some parent object lacked the field. */
  absentSamples?: number;
  /** Sample tags in which no parent object had the field. */
  missingIn?: string[];
  /** Sample tags in which the field was seen. */
  seenIn?: string[];
  /** Observed values outside the declared literals. */
  values?: (string | number)[];
  /** The value set hit its cap, so other values may exist. */
  overflow?: boolean;
  /** Declared type text, for kind mismatches and unresolved types. */
  declared?: string;
  /** From a committed snapshot: no sample counts, values or elements. */
  snapshot?: boolean;
  /** Inside an array whose element cap was hit, so the union split saw a subset. */
  capped?: boolean;
}

/** What the codemod needs to add a missing field. */
export interface FieldEdit {
  key: string;
  /** Type text when the value is a primitive or a localized string; absent for objects and arrays. */
  typeText?: string;
  optional: boolean;
  nullable: boolean;
  /** Keys observed before this one, nearest last, to insert after. */
  before: string[];
  /** When presence depends on sample tags, the tags it was seen in. */
  seenIn?: string[];
}

export interface Finding {
  kind: FindingKind;
  severity: 'error' | 'info';
  confidence: 'high' | 'low';
  group: string;
  path: string;
  declaration?: DeclarationRef;
  evidence: Evidence;
  field?: FieldEdit;
}

export interface ConformResult {
  findings: Finding[];
  /** Declaration key (`file#name`) -> sample groups whose walk reached it. */
  usage: Map<string, Set<string>>;
}

export function declarationKey(ref: Pick<DeclarationRef, 'file' | 'name'>) {
  return `${ref.file}#${ref.name}`;
}

/** What a declared type accepts, with `null`/`undefined` stripped out. */
interface Allowed {
  any: boolean;
  nullable: boolean;
  strings?: { open: boolean; literals: Set<string> };
  numbers?: { open: boolean; literals: Set<number> };
  boolean: boolean;
  objects: Type[];
  /** Element types of declared arrays. */
  arrays: Type[];
}

function allow(types: Type[]): Allowed {
  const allowed: Allowed = {
    any: false,
    nullable: false,
    boolean: false,
    objects: [],
    arrays: [],
  };

  function strings() {
    allowed.strings ??= { open: false, literals: new Set() };
    return allowed.strings;
  }

  function numbers() {
    allowed.numbers ??= { open: false, literals: new Set() };
    return allowed.numbers;
  }

  function visit(type: Type) {
    switch (true) {
      case type.isAny() || type.isUnknown() || type.isTypeParameter():
        allowed.any = true;
        break;

      case type.isNull():
        allowed.nullable = true;
        break;

      case type.isUndefined() || type.isNever():
        // optionality is read from the property, not its type
        break;

      case type.isBoolean() || type.isBooleanLiteral():
        allowed.boolean = true;
        break;

      case type.isUnion():
        for (const member of type.getUnionTypes()) {
          visit(member);
        }
        break;

      case type.isString():
        strings().open = true;
        break;

      case type.isStringLiteral():
        strings().literals.add(type.getLiteralValue() as string);
        break;

      case type.isNumber():
        numbers().open = true;
        break;

      case type.isNumberLiteral():
        numbers().literals.add(type.getLiteralValue() as number);
        break;

      case type.isIntersection(): {
        const members = type.getIntersectionTypes();
        // `string & {}` / `number & {}`: the open half of an OpenUnion
        switch (true) {
          case members.some((member) => member.isString()):
            strings().open = true;
            break;

          case members.some((member) => member.isNumber()):
            numbers().open = true;
            break;

          default:
            allowed.objects.push(type);
        }
        break;
      }

      case type.isArray():
        allowed.arrays.push(type.getArrayElementTypeOrThrow());
        break;

      case type.isTuple():
        allowed.arrays.push(...type.getTupleElements());
        break;

      case type.isObject():
        allowed.objects.push(type);
        break;

      default:
        allowed.any = true;
    }
  }

  for (const type of types) {
    visit(type);
  }

  return allowed;
}

/** Type text for a new field, when the value is mechanical to type. */
export function fieldTypeText(
  node: ShapeNode,
  key: string,
): string | undefined {
  const parts = new Set<string>();
  for (const kind of nonNullKinds(node)) {
    if (kind === 'object' && isLocalized(node)) {
      parts.add('LocalizedString');
    } else if (kind === 'object' || kind === 'array') {
      return undefined;
    } else {
      parts.add(
        primitiveType(
          kind as Exclude<Kind, 'null' | 'object' | 'array'>,
          node,
          key,
        ),
      );
    }
  }
  return parts.size > 0 ? [...parts].join(' | ') : undefined;
}

interface Declared {
  types: Type[];
  optional: boolean;
  ref?: DeclarationRef;
  /** Object members that declare it. */
  members: number;
}

interface Context {
  capped: boolean;
  /** The property (or root type) being walked. */
  ref?: DeclarationRef;
}

export class Walker {
  readonly findings: Finding[] = [];
  readonly usage = new Map<string, Set<string>>();
  private readonly declarations: Declarations;
  private readonly snapshot: boolean;
  private group = '';

  constructor(
    declarations: Declarations,
    options: { snapshot?: boolean } = {},
  ) {
    this.declarations = declarations;
    this.snapshot = options.snapshot ?? false;
  }

  /** Walks one sample group's shape against its declared root (or array item) type. */
  walkGroup(group: string, shape: ShapeNode, type: Type): void {
    this.group = group;
    const ref = this.typeRef(type);
    if (shape.kinds.array && shape.items) {
      this.walkItems(shape, [type], '', { capped: false, ref });
    } else {
      this.walkValue(shape, [type], '', { capped: false, ref });
    }
  }

  addUnresolved(group: string, expression: string, error: string): void {
    this.group = group;
    this.add(
      'unresolved-type',
      '$',
      { capped: false },
      {
        declared: `${expression}: ${error}`,
      },
    );
  }

  private add(
    kind: FindingKind,
    path: string,
    context: Context,
    evidence: Evidence,
    declaration = context.ref,
    field?: FieldEdit,
  ): void {
    if (this.snapshot) {
      evidence.snapshot = true;
    }
    if (context.capped) {
      evidence.capped = true;
    }
    this.findings.push({
      kind,
      severity: SEVERITY[kind],
      confidence: this.snapshot || context.capped ? 'low' : 'high',
      group: this.group,
      path: path || '$',
      ...(declaration ? { declaration } : {}),
      evidence,
      ...(field ? { field } : {}),
    });
  }

  private get location() {
    return this.declarations.location;
  }

  private typeRef(type: Type): DeclarationRef | undefined {
    const symbol = type.getAliasSymbol() ?? type.getSymbol();
    const declaration = symbol?.getDeclarations()[0];
    if (!symbol || !declaration) {
      return undefined;
    }
    const isInterface = Node.isInterfaceDeclaration(declaration);
    return {
      name:
        isInterface || Node.isTypeAliasDeclaration(declaration)
          ? symbol.getName()
          : '(anonymous)',
      file: this.declarations.relativePath(
        declaration.getSourceFile().getFilePath(),
      ),
      line: declaration.getStartLineNumber(),
      isInterface,
    };
  }

  private propertyRef(
    property: MorphSymbol,
    owner: DeclarationRef | undefined,
  ): DeclarationRef | undefined {
    const declaration = property.getDeclarations()[0];
    if (!declaration) {
      return owner && { ...owner, property: property.getName() };
    }
    const parent = declaration.getParent();
    const isInterface = Node.isInterfaceDeclaration(parent);
    return {
      name: isInterface
        ? (parent as InterfaceDeclaration).getName()
        : (owner?.name ?? '(anonymous)'),
      file: this.declarations.relativePath(
        declaration.getSourceFile().getFilePath(),
      ),
      line: declaration.getStartLineNumber(),
      property: property.getName(),
      isInterface,
    };
  }

  private declaredText(types: Type[]): string {
    return types
      .map((type) =>
        type.getText(
          this.location,
          ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
        ),
      )
      .join(' | ')
      .replace(/import\("[^"]*"\)\./g, '');
  }

  private walkValue(
    node: ShapeNode,
    types: Type[],
    path: string,
    context: Context,
    options: { skipObjects?: boolean } = {},
  ): void {
    const allowed = allow(types);
    if (allowed.any) {
      return;
    }

    if (node.kinds.null && !allowed.nullable) {
      this.add('unexpected-null', path, context, {
        kinds: { ...node.kinds },
        objects: node.count,
      });
    }

    const mismatched: Kind[] = [];
    for (const kind of nonNullKinds(node)) {
      switch (kind) {
        case 'string':
          if (allowed.strings) {
            this.checkLiterals(node, 'string', allowed.strings, path, context);
          } else {
            mismatched.push(kind);
          }
          break;
        case 'integer':
        case 'float':
          if (allowed.numbers) {
            this.checkLiterals(node, 'number', allowed.numbers, path, context);
          } else {
            mismatched.push(kind);
          }
          break;
        case 'boolean':
          if (!allowed.boolean) {
            mismatched.push(kind);
          }
          break;
        case 'object':
          if (allowed.objects.length === 0) {
            mismatched.push(kind);
          } else if (!options.skipObjects) {
            this.walkObject(node, allowed.objects, path, context);
          }
          break;
        case 'array':
          if (allowed.arrays.length === 0) {
            mismatched.push(kind);
          } else if (node.items) {
            this.walkItems(node, allowed.arrays, path, context);
          }
          break;
      }
    }

    if (mismatched.length > 0) {
      this.add('kind-mismatch', path, context, {
        kinds: { ...node.kinds },
        declared: this.declaredText(types),
      });
    }
  }

  private checkLiterals<Value extends string | number>(
    node: ShapeNode,
    type: 'string' | 'number',
    allowed: { open: boolean; literals: Set<Value> },
    path: string,
    context: Context,
  ): void {
    if (allowed.open && allowed.literals.size === 0) {
      return;
    }
    const outside = [...node.values.keys()].filter(
      (value): value is Value =>
        typeof value === type && !allowed.literals.has(value as Value),
    );
    if (outside.length > 0) {
      this.add(
        allowed.open ? 'new-literal' : 'unknown-literal',
        path,
        context,
        {
          values: outside,
          ...(node.overflow ? { overflow: true } : {}),
        },
      );
    }
  }

  /** Walks array items, splitting a discriminated object union by the raw elements. */
  private walkItems(
    arrayNode: ShapeNode,
    elementTypes: Type[],
    path: string,
    context: Context,
  ): void {
    const items = arrayNode.items as ShapeNode;
    const itemPath = `${path}[]`;
    const capped =
      context.capped || arrayNode.elements.length < (items.kinds.object ?? 0);
    const itemContext = { ...context, capped };
    const { objects } = allow(elementTypes);

    const union =
      objects.length > 1 && arrayNode.elements.length > 0
        ? this.discriminantOf(objects)
        : undefined;

    if (!union) {
      this.walkValue(items, elementTypes, itemPath, itemContext);
      return;
    }

    this.walkValue(items, elementTypes, itemPath, itemContext, {
      skipObjects: true,
    });

    const grouped = new Map<string, Element[]>();
    for (const element of arrayNode.elements) {
      const value = String(element.value[union.key] ?? '');
      grouped.set(value, [...(grouped.get(value) ?? []), element]);
    }

    for (const [value, elements] of grouped) {
      const member = union.members.get(value);
      const variantPath = `${itemPath}<${value}>`;
      if (!member) {
        this.add(
          'unknown-variant',
          variantPath,
          itemContext,
          {
            objects: elements.length,
            samples: new Set(elements.map((element) => element.sampleId)).size,
            seenIn: [...new Set(elements.map((element) => element.tag))],
          },
          this.typeRef(elementTypes[0]) ?? context.ref,
        );
        continue;
      }
      this.walkObject(
        variantShape(elements),
        [member],
        variantPath,
        itemContext,
      );
    }
  }

  /** The discriminant key of an object union: a string-literal property on every member. */
  private discriminantOf(
    objects: Type[],
  ): { key: string; members: Map<string, Type> } | undefined {
    for (const key of DISCRIMINANT_KEYS) {
      const members = new Map<string, Type>();
      const everyMember = objects.every((member) => {
        const property = member.getProperty(key);
        if (!property) {
          return false;
        }
        const type = property.getTypeAtLocation(this.location);
        const literals = type.isUnion() ? type.getUnionTypes() : [type];
        if (!literals.every((literal) => literal.isStringLiteral())) {
          return false;
        }
        for (const literal of literals) {
          members.set(literal.getLiteralValue() as string, member);
        }
        return true;
      });
      if (everyMember) {
        return { key, members };
      }
    }
    return undefined;
  }

  private walkObject(
    node: ShapeNode,
    objectTypes: Type[],
    path: string,
    context: Context,
  ): void {
    const owners = objectTypes.map((type) => this.typeRef(type));
    for (const owner of owners) {
      if (owner?.isInterface) {
        const key = declarationKey(owner);
        const groups = this.usage.get(key) ?? new Set();
        groups.add(this.group);
        this.usage.set(key, groups);
      }
    }
    // A field missing from an unsplit union has no single interface to add it to.
    const names = [...new Set(owners.map((ref) => ref?.name))];
    const owner =
      names.length > 1 && owners[0]
        ? { ...owners[0], name: names.join(' | '), isInterface: false }
        : owners[0];

    const indexTypes: Type[] = [];
    const declared = new Map<string, Declared>();

    for (const type of objectTypes) {
      const index = type.getStringIndexType();
      if (index && !index.isNever()) {
        indexTypes.push(index);
      }
      const typeOwner = this.typeRef(type);
      for (const property of type.getProperties()) {
        const name = property.getName();
        const entry = declared.get(name) ?? {
          types: [],
          optional: false,
          members: 0,
          ref: this.propertyRef(property, typeOwner),
        };
        entry.types.push(property.getTypeAtLocation(this.location));
        entry.optional ||= property.hasFlags(ts.SymbolFlags.Optional);
        entry.members += 1;
        declared.set(name, entry);
      }
    }

    const total = node.kinds.object ?? 0;
    const keys = [...node.props.keys()];

    keys.forEach((key, position) => {
      const child = node.props.get(key) as ShapeNode;
      const childPath = `${path}.${key}`;
      const entry = declared.get(key);

      if (!entry) {
        if (indexTypes.length > 0) {
          this.walkValue(child, indexTypes, childPath, context);
          return;
        }
        const optional = child.count < total;
        this.add(
          'missing-field',
          childPath,
          context,
          this.presence(node, child),
          owner,
          {
            key,
            typeText: fieldTypeText(child, key),
            optional,
            nullable: Boolean(child.kinds.null),
            before: keys.slice(0, position),
            // Some sample tags never had the field at all.
            ...(optional && child.seenIn.size < node.seenIn.size
              ? { seenIn: [...child.seenIn] }
              : {}),
          },
        );
        return;
      }

      const optional = entry.optional || entry.members < objectTypes.length;
      const fieldContext = { ...context, ref: entry.ref };
      this.walkValue(child, entry.types, childPath, fieldContext);

      if (!optional && child.count < total) {
        this.add(
          'required-but-absent',
          childPath,
          fieldContext,
          this.presence(node, child),
        );
      }
    });

    if (total === 0) {
      return;
    }

    for (const [key, entry] of declared) {
      if (node.props.has(key)) {
        continue;
      }
      const optional = entry.optional || entry.members < objectTypes.length;
      this.add(
        optional ? 'unseen-field' : 'required-but-absent',
        `${path}.${key}`,
        { ...context, ref: entry.ref },
        optional
          ? { objects: total }
          : {
              objects: total,
              present: 0,
              samples: node.objectSamples.size,
              absentSamples: node.objectSamples.size,
            },
      );
    }
  }

  private presence(parent: ShapeNode, child: ShapeNode): Evidence {
    return {
      kinds: { ...child.kinds },
      objects: parent.kinds.object ?? 0,
      present: child.count,
      samples: parent.objectSamples.size,
      absentSamples: child.absentIn.size,
      ...(child.missingIn.size > 0 ? { missingIn: [...child.missingIn] } : {}),
      seenIn: [...child.seenIn],
    };
  }
}

/** Conformance of every sample group's shape to its declared SDK type. */
export function conformShapes(
  shapes: Map<string, ShapeNode>,
  declarations: Declarations,
  options: { snapshot?: boolean } = {},
): ConformResult {
  const expressions = new Map<string, string>();
  for (const group of shapes.keys()) {
    const endpoint = group.split('.').slice(0, 2).join('.');
    expressions.set(group, declaredTypeFor(group, endpoint));
  }

  const resolved = declarations.resolve([...new Set(expressions.values())]);
  const walker = new Walker(declarations, options);

  for (const [group, shape] of [...shapes].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const expression = expressions.get(group) as string;
    const { type, error } = resolved.get(expression) ?? {};
    if (!type) {
      walker.addUnresolved(group, expression, error ?? 'not resolved');
      continue;
    }
    walker.walkGroup(group, shape, type);
  }

  return { findings: walker.findings, usage: walker.usage };
}
