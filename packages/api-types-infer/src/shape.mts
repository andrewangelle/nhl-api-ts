/**
 * Shape tree: merges many JSON samples into one description of a payload
 * (kinds seen, how often each path occurs, which tags it was missing under).
 */

export type Kind =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array';

/** Max distinct primitive values kept per node, for enum suggestions. */
export const VALUE_CAP = 25;

/** Max raw array elements kept per node, for discriminated-union analysis. */
export const ELEMENT_CAP = 4000;

export interface Element {
  value: Record<string, unknown>;
  tag: string;
  /** The raw sample the element came from, so a union split can group elements by response. */
  sampleId: number;
}

export interface ShapeNode {
  count: number;
  kinds: Partial<Record<Kind, number>>;
  values: Map<string | number, number>;
  overflow: boolean;
  props: Map<string, ShapeNode>;
  items?: ShapeNode;
  elements: Element[];
  /** Tags of the samples in which this node occurred. */
  seenIn: Set<string>;
  /** Tags of the samples in which a parent object existed but this node did not. */
  missingIn: Set<string>;
  sampleId: number;
  sampleCount: number;
  /** Objects merged into this node during the current sample (`sampleCount` also counts nulls and other kinds). */
  sampleObjects: number;
  /** Raw samples in which this node was an object at least once. */
  objectSamples: Set<number>;
  /** Raw samples in which a parent object existed without this node (in some or all of that sample's objects). */
  absentIn: Set<number>;
}

export function newNode(): ShapeNode {
  return {
    count: 0,
    kinds: {},
    values: new Map(),
    overflow: false,
    props: new Map(),
    elements: [],
    seenIn: new Set(),
    missingIn: new Set(),
    sampleId: -1,
    sampleCount: 0,
    sampleObjects: 0,
    objectSamples: new Set(),
    absentIn: new Set(),
  };
}

export function kindOf(value: unknown): Kind {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'float';
    default:
      return 'object';
  }
}

export function tagLabel(tags: Record<string, string>): string {
  return (
    Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join(',') || 'default'
  );
}

export function merge(
  node: ShapeNode,
  value: unknown,
  tag: string,
  sampleId: number,
): void {
  if (node.sampleId !== sampleId) {
    node.sampleId = sampleId;
    node.sampleCount = 0;
    node.sampleObjects = 0;
  }

  node.sampleCount += 1;
  node.count += 1;
  node.seenIn.add(tag);

  const kind = kindOf(value);
  node.kinds[kind] = (node.kinds[kind] ?? 0) + 1;

  // Block A
  switch (kind) {
    case 'string':
    case 'integer':
    case 'float': {
      const primitive = value as string | number;

      if (node.values.has(primitive)) {
        node.values.set(primitive, (node.values.get(primitive) ?? 0) + 1);
      } else if (node.values.size < VALUE_CAP) {
        node.values.set(primitive, 1);
      } else {
        node.overflow = true;
      }
      break;
    }

    case 'object': {
      node.sampleObjects += 1;
      node.objectSamples.add(sampleId);
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>,
      )) {
        let childNode = node.props.get(key);
        if (!childNode) {
          childNode = newNode();
          // Every earlier sample with objects here lacked this key.
          for (const earlier of node.objectSamples) {
            if (earlier !== sampleId) {
              childNode.absentIn.add(earlier);
            }
          }
          node.props.set(key, childNode);
        }
        merge(childNode, child, tag, sampleId);
      }

      break;
    }

    case 'array': {
      node.items ??= newNode();
      for (const item of value as unknown[]) {
        merge(node.items, item, tag, sampleId);
        if (kindOf(item) === 'object' && node.elements.length < ELEMENT_CAP) {
          node.elements.push({
            value: item as Record<string, unknown>,
            tag,
            sampleId,
          });
        }
      }
      break;
    }
  }
}

/** After a sample is merged, record which props were absent from objects of that sample. */
export function finishSample(
  node: ShapeNode,
  sampleId: number,
  tag: string,
): void {
  if (node.sampleId !== sampleId) {
    return;
  }
  const objectsInSample = node.sampleCount;
  if (node.kinds.object) {
    for (const child of node.props.values()) {
      const present = child.sampleId === sampleId ? child.sampleCount : 0;
      // Only whole-sample absence is a usable "absent when" signal; a field
      // missing from some elements of a sample varies per element instead.
      if (present === 0 && objectsInSample > 0) {
        child.missingIn.add(tag);
      }
      if (present < node.sampleObjects) {
        child.absentIn.add(sampleId);
      }
      finishSample(child, sampleId, tag);
    }
  }
  if (node.items) {
    finishSample(node.items, sampleId, tag);
  }
}

export function nonNullKinds(node: ShapeNode): Kind[] {
  return (Object.keys(node.kinds) as Kind[]).filter((kind) => kind !== 'null');
}

// ----- compact committed snapshot -----

export interface Snapshot {
  /** path -> "<kinds>[?]" where ? marks optional. */
  [path: string]: string;
}

/**
 * Flattens a shape tree into `path -> kinds` entries. Paths use `[]` for array
 * items. A trailing `?` marks a path that is not present in every parent.
 */
export function snapshot(root: ShapeNode): Snapshot {
  const out: Snapshot = {};

  function walk(node: ShapeNode, path: string, optional: boolean) {
    const kinds = Object.keys(node.kinds).sort().join('|');

    out[path || '$'] = `${kinds}${optional ? '?' : ''}`;
    for (const [key, child] of [...node.props].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      walk(child, `${path}.${key}`, child.count < (node.kinds.object ?? 0));
    }
    if (node.items) {
      walk(node.items, `${path}[]`, false);
    }
  }

  walk(root, '', false);

  return out;
}

const SNAPSHOT_ROOT_COUNT = 1000;

/** Splits a snapshot path (`.a.b[].c`) into its segments; `[]` is an array item. */
export function pathSegments(path: string): string[] {
  return path.match(/\[\]|\.[^.[]*/g) ?? [];
}

/**
 * Rebuilds a shape tree from a committed snapshot, for replaying history.
 * Snapshots keep only kinds and an optional flag, so the tree has no values,
 * elements or sample IDs. A required node is seen as often as its parent,
 * an optional one once less.
 */
export function shapeFromSnapshot(snap: Snapshot): ShapeNode {
  const root = newNode();
  root.count = SNAPSHOT_ROOT_COUNT;
  const nodes = new Map<string, ShapeNode>([['$', root]]);

  for (const [path, entry] of Object.entries(snap).sort(
    ([left], [right]) => pathSegments(left).length - pathSegments(right).length,
  )) {
    let node = root;
    const optional = entry.endsWith('?');
    if (path !== '$') {
      const segments = pathSegments(path);
      const last = segments.at(-1) as string;
      const parent = nodes.get(segments.slice(0, -1).join('') || '$');
      if (!parent) {
        continue;
      }
      node = newNode();
      node.count = parent.count - (optional ? 1 : 0);
      if (last === '[]') {
        parent.items = node;
      } else {
        parent.props.set(last.slice(1), node);
      }
      nodes.set(path, node);
    }
    for (const kind of parseEntry(entry).kinds) {
      node.kinds[kind] = node.count;
    }
  }

  return root;
}

/** Rewrites `snap` in `snapshot()` order (sorted props, depth-first, `[]` last). */
export function normalizeSnapshot(snap: Snapshot): Snapshot {
  return snapshot(shapeFromSnapshot(snap));
}

/** The kinds and optional flag of a snapshot value; `""` (an always-empty array's items) has no kinds. */
export function parseEntry(entry: string): {
  kinds: Set<Kind>;
  optional: boolean;
} {
  const optional = entry.endsWith('?');
  const kinds = (optional ? entry.slice(0, -1) : entry)
    .split('|')
    .filter(Boolean) as Kind[];
  return { kinds: new Set(kinds), optional };
}

export function formatEntry(kinds: Iterable<Kind>, optional: boolean): string {
  return `${[...kinds].sort().join('|')}${optional ? '?' : ''}`;
}

export function isSubset(left: Set<Kind>, right: Set<Kind>): boolean {
  return [...left].every((kind) => right.has(kind));
}

/** The parent path of a snapshot path (`$` for a top-level one), or `undefined` for `$`. */
export function parentPath(path: string): string | undefined {
  if (path === '$') {
    return undefined;
  }
  return pathSegments(path).slice(0, -1).join('') || '$';
}

/** The kind a parent needs for `path` to exist under it: `array` for `[]`, `object` for `.prop`. */
export function neededKind(path: string): Kind {
  return path.endsWith('[]') ? 'array' : 'object';
}

/** Orders snapshot paths like `snapshot()`: depth-first, props by name, `[]` after the props. */
export function comparePaths(left: string, right: string): number {
  const leftSegments = left === '$' ? [] : pathSegments(left);
  const rightSegments = right === '$' ? [] : pathSegments(right);
  const shared = Math.min(leftSegments.length, rightSegments.length);
  for (let index = 0; index < shared; index++) {
    const leftSegment = leftSegments[index];
    const rightSegment = rightSegments[index];
    if (leftSegment === rightSegment) {
      continue;
    }
    if (leftSegment === '[]') {
      return 1;
    }
    if (rightSegment === '[]') {
      return -1;
    }
    return leftSegment.slice(1).localeCompare(rightSegment.slice(1));
  }
  return leftSegments.length - rightSegments.length;
}

/**
 * Merges `next` into `base`. New paths are added (marked `?` when their
 * parent exists on the other side). Paths in both take the union of both
 * values in either mode. When `next` both adds and drops kinds, `overwrite`
 * (infer) takes `next`'s value and add-only (check --accept) keeps `base`'s.
 * Narrowing otherwise needs a reset. A `base` value of `""` always yields to
 * `next`'s.
 * Paths only in `base` are kept. The result is in `snapshot()` order.
 *
 * Neither mode orphans a child: a `next`-only child whose parent's merged
 * value lacks the kind it needs (`object` for `.prop`, `array` for `[]`) is
 * skipped, and overwrite keeps `base`'s value for a path whose kept
 * `base`-only children `next`'s value can't hold.
 */
export function mergeSnapshots(
  base: Snapshot,
  next: Snapshot,
  options: { overwrite: boolean },
): Snapshot {
  const merged: Snapshot = {};
  const paths = [...new Set([...Object.keys(base), ...Object.keys(next)])].sort(
    comparePaths,
  );

  // Kinds the base-only children of each path need from it.
  const baseOnlyNeeds = new Map<string, Set<Kind>>();
  for (const path of Object.keys(base)) {
    const parent = parentPath(path);
    if (parent !== undefined && !(path in next)) {
      const needs = baseOnlyNeeds.get(parent) ?? new Set();
      needs.add(neededKind(path));
      baseOnlyNeeds.set(parent, needs);
    }
  }

  for (const path of paths) {
    const parent = parentPath(path);
    const isItems = path.endsWith('[]');

    if (path in base && path in next) {
      merged[path] = mergeEntry(
        base[path],
        next[path],
        isItems,
        options.overwrite,
        baseOnlyNeeds.get(path),
      );
      continue;
    }

    if (path in base) {
      // Absent from next's parents that could hold it: optional in the union.
      const absentInNext =
        options.overwrite &&
        !isItems &&
        parent !== undefined &&
        parent in next &&
        parseEntry(next[parent]).kinds.has(neededKind(path));
      merged[path] = absentInNext ? withOptional(base[path]) : base[path];
      continue;
    }

    if (parent === undefined) {
      merged[path] = next[path];
      continue;
    }
    if (
      !(parent in merged) ||
      !parseEntry(merged[parent]).kinds.has(neededKind(path))
    ) {
      // The parent was skipped, or a type change left it without the kind
      // this child needs: leave it for a human.
      continue;
    }
    const absentInBase =
      !isItems &&
      parent in base &&
      parseEntry(base[parent]).kinds.has(neededKind(path));
    merged[path] = absentInBase ? withOptional(next[path]) : next[path];
  }

  return merged;
}

function withOptional(entry: string): string {
  return entry.endsWith('?') ? entry : `${entry}?`;
}

function mergeEntry(
  baseEntry: string,
  nextEntry: string,
  isItems: boolean,
  overwrite: boolean,
  baseOnlyNeeds: Set<Kind> | undefined,
): string {
  const baseValue = parseEntry(baseEntry);
  const nextValue = parseEntry(nextEntry);
  const optional = !isItems && (baseValue.optional || nextValue.optional);

  if (baseValue.kinds.size === 0) {
    return formatEntry(nextValue.kinds, optional);
  }
  if (isSubset(nextValue.kinds, baseValue.kinds)) {
    return formatEntry(baseValue.kinds, optional);
  }
  if (isSubset(baseValue.kinds, nextValue.kinds)) {
    return formatEntry(nextValue.kinds, optional);
  }
  // Adds and drops kinds: a real type change.
  const orphans = [...(baseOnlyNeeds ?? [])].some(
    (kind) => !nextValue.kinds.has(kind),
  );
  return overwrite && !orphans ? nextEntry : baseEntry;
}
