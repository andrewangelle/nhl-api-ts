/** Every `$ref` value in `node`, depth first. */
export function refsIn(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(refsIn);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    key === '$ref' && typeof child === 'string' ? [child] : refsIn(child),
  );
}

/** The node a local JSON pointer (`#/a/b`) names in `document`, if any. */
export function resolve(
  document: unknown,
  pointer: string,
): { node: unknown } | undefined {
  if (!pointer.startsWith('#/')) {
    return undefined;
  }
  let node = document;
  for (const segment of pointer.slice(2).split('/')) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (
      node === null ||
      typeof node !== 'object' ||
      !Object.hasOwn(node, key)
    ) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[key];
  }
  return { node };
}

/** Pointers to every entry under `components`, e.g. `#/components/schemas/Roster`. */
export function componentPointers(document: Record<string, unknown>): string[] {
  const components = (document.components ?? {}) as Record<string, object>;
  return Object.entries(components).flatMap(([kind, entries]) =>
    Object.keys(entries).map((name) => `#/components/${kind}/${name}`),
  );
}

/** Pointers reachable from `paths` by following `$ref`s transitively. */
export function reachableFromPaths(
  document: Record<string, unknown>,
): Set<string> {
  const reached = new Set<string>();
  const pending = refsIn(document.paths);
  while (pending.length > 0) {
    const pointer = pending.pop() as string;
    if (reached.has(pointer)) {
      continue;
    }
    reached.add(pointer);
    pending.push(...refsIn(resolve(document, pointer)?.node));
  }
  return reached;
}
