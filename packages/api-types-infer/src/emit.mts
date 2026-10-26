/**
 * Turns a shape tree into draft TypeScript interfaces that follow the
 * response-type rules in AGENTS.md (optionality, open enums, discriminated
 * unions, dynamic-key maps, localized strings).
 */
import {
  type Element,
  finishSample,
  type Kind,
  merge,
  newNode,
  nonNullKinds,
  type ShapeNode,
} from '#src/shape.mjs';

/** String fields suggested as `OpenUnion<...>` when few values were seen. */
export const ENUM_KEYS = new Set([
  'gameState',
  'gameScheduleState',
  'zoneCode',
  'shotType',
  'positionCode',
  'periodType',
  'lastPeriodType',
  'typeDescKey',
  'situationCode',
  'homeTeamDefendingSide',
  'shootsCatches',
  'reason',
  'secondaryReason',
  'descKey',
  'eventOwnerTeamId',
]);

export const NUMERIC_CODE_KEYS = new Set(['gameType', 'gameTypeId']);

/** Keys tried, in order, as the discriminant of an array of objects. */
export const DISCRIMINANT_KEYS = [
  'typeDescKey',
  'positionCode',
  'gameType',
  'descKey',
];

const LANGUAGES = new Set([
  'cs',
  'de',
  'es',
  'fi',
  'fr',
  'sk',
  'sv',
  'en',
  'ru',
]);

export interface EmitOptions {
  /** Paths (`.a.b`, `[]` for array items) that are dynamic-key maps. */
  mapPaths?: string[];
  /** Interface-name overrides keyed by path. */
  names?: Record<string, string>;
}

function pascal(text: string): string {
  return text
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, next: string | undefined) =>
      (next ?? '').toUpperCase(),
    )
    .replace(/^./, (first) => first.toUpperCase());
}

function singular(word: string): string {
  if (/series$/i.test(word) || word.endsWith('ss')) {
    return word;
  }

  if (word.endsWith('goalies')) {
    return word.slice(0, -1);
  }

  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }

  if (/(ch|sh|x)es$/.test(word)) {
    return word.slice(0, -2);
  }

  return word.endsWith('s') ? word.slice(0, -1) : word;
}

export function quoteKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

function looksDynamic(node: ShapeNode): boolean {
  const keys = [...node.props.keys()];
  if (keys.length < 5) {
    return false;
  }
  const numeric = keys.every((key) => /^\d+$/.test(key));
  const dated = keys.every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
  return numeric || dated;
}

export function isLocalized(node: ShapeNode): boolean {
  return (
    node.props.has('default') &&
    [...node.props.keys()].every(
      (key) => key === 'default' || LANGUAGES.has(key),
    ) &&
    nonNullKinds(node.props.get('default') as ShapeNode).join() === 'string'
  );
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const shared = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 1 : shared / union;
}

/** Paths (to `depth`) present in every parent object; optional fields don't count as a split. */
function pathSet(node: ShapeNode, depth: number, prefix = ''): Set<string> {
  const out = new Set<string>();

  if (depth === 0) {
    return out;
  }

  const total = node.kinds.object ?? 0;
  for (const [key, child] of node.props) {
    if (child.count < total) {
      continue;
    }

    out.add(`${prefix}${key}`);

    for (const nested of pathSet(child, depth - 1, `${prefix}${key}.`)) {
      out.add(nested);
    }
  }
  return out;
}

/**
 * The type text for a primitive kind at a key: `OpenUnion<...>` for known
 * enum-like string keys with few values, `GameType` for numeric game-type codes.
 */
export function primitiveType(
  kind: 'string' | 'integer' | 'float' | 'boolean',
  node: ShapeNode,
  key: string,
): string {
  switch (kind) {
    case 'string': {
      if (ENUM_KEYS.has(key) && !node.overflow && node.values.size > 0) {
        const known = [...node.values.keys()]
          .map((value) => `'${value}'`)
          .join(' | ');

        return `OpenUnion<${known}>`;
      }

      return 'string';
    }
    case 'integer':
    case 'float':
      return NUMERIC_CODE_KEYS.has(key) ? 'GameType' : 'number';
    case 'boolean':
      return 'boolean';
  }
}

function shapeOf(elements: Element[], sampleBase: number): ShapeNode {
  const node = newNode();
  elements.forEach(({ value, tag }, index) => {
    merge(node, value, tag, sampleBase + index);
    finishSample(node, sampleBase + index, tag);
  });
  return node;
}

/**
 * The shape of one variant's elements, keeping their raw sample IDs, so two
 * elements from one response count as one sample (unlike drafts, which treat
 * each element as its own sample).
 */
export function variantShape(elements: Element[]): ShapeNode {
  const node = newNode();
  let current: Element | undefined;
  for (const element of elements) {
    if (current && current.sampleId !== element.sampleId) {
      finishSample(node, current.sampleId, current.tag);
    }
    merge(node, element.value, element.tag, element.sampleId);
    current = element;
  }
  if (current) {
    finishSample(node, current.sampleId, current.tag);
  }
  return node;
}

export class Emitter {
  readonly interfaces = new Map<string, string>();
  readonly notes: string[] = [];
  private readonly bodies = new Map<string, string>();
  private readonly usedNames = new Set<string>();
  private readonly rootName: string;
  private readonly options: EmitOptions;

  constructor(rootName: string, options: EmitOptions = {}) {
    this.rootName = rootName;
    this.options = options;
  }

  /** Returns the TS type expression for the root node, filling `interfaces`. */
  emitRoot(node: ShapeNode): string {
    return this.typeOf(node, '', this.rootName);
  }

  /**
   * Names an interface after the last segments of its path, adding parent
   * segments only when the shorter name is already taken.
   */
  private nameFor(path: string, suggestion: string): string {
    const override = this.options.names?.[path];
    if (override) {
      return override;
    }
    const segments = suggestion.split(/[. ]+/).filter(Boolean);

    for (
      let size = Math.min(2, segments.length);
      size <= segments.length;
      size += 1
    ) {
      const candidate = pascal(segments.slice(-size).join(' '));

      if (!this.usedNames.has(candidate)) {
        return candidate;
      }
    }

    const base = pascal(segments.join(' '));
    let name = base;
    let counter = 2;

    while (this.usedNames.has(name)) {
      name = `${base}${counter}`;
      counter += 1;
    }

    return name;
  }

  private typeOf(node: ShapeNode, path: string, suggestion: string): string {
    const kinds = nonNullKinds(node);
    const parts = new Set<string>();
    for (const kind of kinds) {
      parts.add(this.kindType(kind, node, path, suggestion));
    }
    if (parts.size === 0) {
      // only ever null, or an array that was empty in every sample
      return 'unknown';
    }
    let text = [...parts].join(' | ');
    if (node.kinds.null && node.kinds.null > 0 && path !== '') {
      text = `${text} | null`;
    }
    return text;
  }

  private kindType(
    kind: Kind,
    node: ShapeNode,
    path: string,
    suggestion: string,
  ): string {
    switch (kind) {
      case 'string':
      case 'integer':
      case 'float':
      case 'boolean':
        return primitiveType(kind, node, suggestion.split('.').at(-1) ?? '');
      case 'array': {
        if (!node.items) {
          return 'unknown[]';
        }
        const itemType = this.arrayItemType(node, path, suggestion);
        return itemType.includes(' | ') && !itemType.startsWith('(')
          ? `(${itemType})[]`
          : `${itemType}[]`;
      }
      case 'object':
        return this.objectType(node, path, suggestion);
      default:
        return 'unknown';
    }
  }

  private arrayItemType(
    node: ShapeNode,
    path: string,
    suggestion: string,
  ): string {
    const items = node.items as ShapeNode;
    const itemPath = `${path}[]`;
    const itemSuggestion = singular(suggestion);

    if (items.kinds.object && node.elements.length > 0) {
      const variants = this.splitVariants(node);

      if (variants) {
        const names: string[] = [];
        for (const [value, shape] of variants.groups) {
          names.push(
            this.objectType(
              shape,
              `${itemPath}<${value}>`,
              `${itemSuggestion}.${value}`,
              { key: variants.key, value },
            ),
          );
        }

        const unionName = this.nameFor(
          `${itemPath}:union`,
          `${itemSuggestion}Union`,
        );

        this.usedNames.add(unionName);
        this.interfaces.set(
          unionName,
          `export type ${unionName} = ${names.join(' | ')};`,
        );

        return unionName;
      }
    }
    return this.typeOf(items, itemPath, itemSuggestion);
  }

  /** Splits an array of objects into variants when a discriminant key warrants it. */
  private splitVariants(
    node: ShapeNode,
  ): { key: string; groups: Map<string, ShapeNode> } | undefined {
    const { elements } = node;

    if (elements.length < 6) {
      return undefined;
    }

    for (const key of DISCRIMINANT_KEYS) {
      if (!elements.every(({ value }) => typeof value[key] === 'string')) {
        continue;
      }

      const grouped = new Map<string, Element[]>();
      for (const element of elements) {
        const value = element.value[key] as string;
        grouped.set(value, [...(grouped.get(value) ?? []), element]);
      }

      if (grouped.size < 2 || grouped.size > 40) {
        continue;
      }

      const shapes = new Map<string, ShapeNode>();
      let base = 0;

      for (const [value, group] of grouped) {
        shapes.set(value, shapeOf(group, base));
        base += group.length;
      }

      const sets = [...shapes.values()].map((shape) => pathSet(shape, 3));

      let minimum = 1;
      for (let left = 0; left < sets.length; left += 1) {
        for (let right = left + 1; right < sets.length; right += 1) {
          minimum = Math.min(minimum, jaccard(sets[left], sets[right]));
        }
      }

      if (minimum < 0.8) {
        return { key, groups: shapes };
      }
    }
    return undefined;
  }

  private objectType(
    node: ShapeNode,
    path: string,
    suggestion: string,
    discriminant?: { key: string; value: string },
  ): string {
    if (isLocalized(node)) {
      return 'LocalizedString';
    }

    if (this.options.mapPaths?.includes(path) || looksDynamic(node)) {
      const merged = newNode();

      for (const child of node.props.values()) {
        mergeNodes(merged, child);
      }

      return `Record<string, ${this.typeOf(merged, `${path}.*`, singular(suggestion))}>`;
    }

    if (node.props.size === 0) {
      return 'Record<string, never>';
    }

    const total = node.kinds.object ?? 0;
    const lines: string[] = [];

    for (const [key, child] of node.props) {
      if (discriminant && key === discriminant.key) {
        lines.push(`  ${quoteKey(key)}: '${discriminant.value}';`);
        continue;
      }

      const optional = child.count < total;
      const type = this.typeOf(child, `${path}.${key}`, `${suggestion}.${key}`);
      const notes: string[] = [];

      if (optional) {
        const tags = [...child.missingIn];
        if (tags.length > 0 && tags.length <= 6) {
          notes.push(`Absent when ${tags.join('; ')}`);
        } else if (tags.length > 6) {
          notes.push(`Absent in ${tags.length} sample groups`);
        }
      }

      if (optional && child.seenIn.size < 3) {
        notes.push('Low sample count');
      }

      // Line comments, not JSDoc: the notes name sample tags, which mean
      // nothing to SDK users. Rewrite them as JSDoc by hand in `src/types/`.
      if (notes.length > 0) {
        lines.push(`  // ${notes.join('. ')}`);
      }

      lines.push(`  ${quoteKey(key)}${optional ? '?' : ''}: ${type};`);
    }

    const body = lines.join('\n');
    const existing = this.bodies.get(body);

    if (existing) {
      return existing;
    }

    const name = this.nameFor(path, suggestion);

    this.usedNames.add(name);
    this.bodies.set(body, name);
    this.interfaces.set(name, `export interface ${name} {\n${body}\n}`);

    return name;
  }
}

/** Folds `source` into `target` (used to unify the values of a dynamic-key map). */
export function mergeNodes(target: ShapeNode, source: ShapeNode): void {
  target.count += source.count;

  for (const [kind, count] of Object.entries(source.kinds)) {
    target.kinds[kind as Kind] =
      (target.kinds[kind as Kind] ?? 0) + (count ?? 0);
  }

  for (const [value, count] of source.values) {
    target.values.set(value, (target.values.get(value) ?? 0) + count);
  }

  target.overflow ||= source.overflow;

  for (const tag of source.seenIn) {
    target.seenIn.add(tag);
  }

  for (const tag of source.missingIn) {
    target.missingIn.add(tag);
  }

  for (const id of source.objectSamples) {
    target.objectSamples.add(id);
  }

  for (const id of source.absentIn) {
    target.absentIn.add(id);
  }

  for (const [key, child] of source.props) {
    let existing = target.props.get(key);

    if (!existing) {
      existing = newNode();
      target.props.set(key, existing);
    }

    mergeNodes(existing, child);
  }

  if (source.items) {
    target.items ??= newNode();
    mergeNodes(target.items, source.items);
  }

  target.elements.push(...source.elements);
}
