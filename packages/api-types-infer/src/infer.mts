/**
 * Merges the cached samples of each endpoint into a shape tree and writes:
 *   .api-types/report/<endpoint>.md        path table (required/optional/nullable, enums)
 *   .api-types/draft/<endpoint>.mts        draft interfaces
 *   shapes/<endpoint>.json                 committed shape snapshot (drift baseline)
 *
 *   pnpm api-types:infer
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  buildShape,
  emitFor,
  loadSamples,
  type RawSample,
} from '#src/load.mjs';
import { DRAFT_DIR, RAW_DIR, REPORT_DIR, SHAPES_DIR } from '#src/paths.mjs';
import { type ShapeNode, snapshot } from '#src/shape.mjs';
import { ALIASES, specFor, splitGroup } from '#src/specs.mjs';

export interface SampleGroup {
  /** The endpoint whose spec (unwrap, name) applies. */
  endpoint: string;
  samples: RawSample[];
}

/** Splits every endpoint's samples by its `groupBy` tag, folding in aliased endpoints. */
export function groupAll(
  all: Map<string, RawSample[]>,
): Map<string, SampleGroup> {
  const groups = new Map<string, SampleGroup>();
  for (const [endpoint, samples] of all) {
    const alias = ALIASES[endpoint];
    const target = alias?.endpoint ?? endpoint;
    const { groupBy } = specFor(target);
    for (const sample of samples) {
      const tag = alias?.group ?? (groupBy ? sample.tags[groupBy] : undefined);
      const key = tag ? `${target}.${tag}` : target;
      const group = groups.get(key) ?? { endpoint: target, samples: [] };
      group.samples.push(sample);
      groups.set(key, group);
    }
  }
  return groups;
}

function reportRows(root: ShapeNode): string[] {
  const rows: string[] = [];

  function walk(node: ShapeNode, path: string, parentObjects: number) {
    const kinds = Object.entries(node.kinds)
      .map(
        ([kind, count]) => `${kind}${count === node.count ? '' : `(${count})`}`,
      )
      .join(' \\| ');

    function getStatus() {
      if (path === '') {
        return 'root';
      }

      if (node.count === parentObjects) {
        if (node.kinds.null) {
          return 'nullable';
        }
        return 'required';
      }

      if (node.kinds.null) {
        return 'optional, nullable';
      }

      return 'optionals';
    }

    const status = getStatus();

    const enumCandidates =
      !node.overflow && node.values.size > 0 && node.values.size <= 12
        ? [...node.values.keys()].join(', ')
        : '';

    const missing =
      node.count < parentObjects
        ? [...node.missingIn].slice(0, 8).join('; ')
        : '';

    rows.push(
      `| \`${path || '$'}\` | ${status} | ${kinds} | ${node.count} | ${enumCandidates.replace(/\|/g, '\\|')} | ${missing} |`,
    );

    for (const [key, child] of node.props) {
      walk(child, `${path}.${key}`, node.kinds.object ?? 0);
    }

    if (node.items) {
      walk(node.items, `${path}[]`, node.items.count);
    }
  }

  walk(root, '', 0);

  return rows;
}

export function inferAll(rawDir: string): Map<string, ShapeNode> {
  const shapes = new Map<string, ShapeNode>();
  for (const [key, group] of groupAll(loadSamples(rawDir))) {
    shapes.set(key, buildShape(group.samples, specFor(group.endpoint).unwrap));
  }
  return shapes;
}

/**
 * The draft file for a sample group. A grouped endpoint's root is named
 * after its group (`SkaterRowSummary`, not `SkaterRow`).
 */
export function draftFor(group: string, shape: ShapeNode): string {
  const { endpoint, groupName } = splitGroup(group);
  const spec = specFor(endpoint);

  const { type, interfaces } = emitFor(shape, {
    ...spec,
    name: groupName
      ? `${spec.name}${groupName[0].toUpperCase()}${groupName.slice(1)}`
      : spec.name,
  });

  return `// root: ${type}\n${[...interfaces.values()].join('\n\n')}\n`;
}

if (import.meta.main) {
  mkdirSync(REPORT_DIR, { recursive: true });
  mkdirSync(DRAFT_DIR, { recursive: true });
  mkdirSync(SHAPES_DIR, { recursive: true });

  const shapes = inferAll(RAW_DIR);

  for (const [group, shape] of shapes) {
    writeFileSync(
      `${REPORT_DIR}/${group}.md`,
      `# ${group}\n\n| path | status | kinds | count | values | missing when |\n| --- | --- | --- | --- | --- | --- |\n${reportRows(shape).join('\n')}\n`,
    );

    writeFileSync(`${DRAFT_DIR}/${group}.mts`, draftFor(group, shape));

    writeFileSync(
      `${SHAPES_DIR}/${group}.json`,
      `${JSON.stringify(snapshot(shape), null, 2)}\n`,
    );
  }
  console.error(`inferred ${shapes.size} shapes`);
}
