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
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>,
      )) {
        let childNode = node.props.get(key);
        if (!childNode) {
          childNode = newNode();
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
          node.elements.push({ value: item as Record<string, unknown>, tag });
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
