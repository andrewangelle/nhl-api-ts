/**
 * Drift check: refetches the sample matrix into `.api-types/check/raw`, then
 * runs conform on it against the SDK types and exits 1 on its errors. Also
 * diffs the re-inferred shapes against the committed snapshots in `shapes/`
 * (new fields, removed fields, widened or changed values, and `?` fields this
 * run's samples didn't carry) as information. Manual only; run it before each
 * release.
 *
 * Lists every drifted path; `--terse` prints one `+N -N ~N` line per shape.
 * `--replay` skips the refetch and reports on the responses the last run left
 * in `.api-types/check/raw`, against the current `shapes/` and SDK types.
 * A shape with a sample that was rate-limited or hit a server error is not
 * diffed (its missing fields would read as removed) and is listed as skipped.
 * `--only <prefix>...` limits the refetch, the diff and conform to the shapes
 * whose key starts with one of the prefixes, e.g. `--only edge gameCenter`.
 * `--accept` merges the `+` paths and widened values (`required -> optional`,
 * `kinds added`) into `shapes/`; without it, the summary says how much it
 * would take. It never drops a path or a kind and runs before conform.
 *
 *   pnpm api-types:check [--terse] [--replay] [--accept] [--only <prefix>...]
 */
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { runConform } from '#src/conform.mjs';
import { matchesOnly, optionValues, runFetch } from '#src/fetch.mjs';
import { groupAll, inferAll } from '#src/infer.mjs';
import { loadSamples, type RawSample } from '#src/load.mjs';
import { CACHE_DIR, SHAPES_DIR, writeSnapshot } from '#src/paths.mjs';
import {
  comparePaths,
  isSubset,
  mergeSnapshots,
  neededKind,
  parentPath,
  parseEntry,
  type ShapeNode,
  type Snapshot,
  snapshot,
} from '#src/shape.mjs';
import { ALIASES } from '#src/specs.mjs';

const CHECK_RAW = `${CACHE_DIR}/check/raw`;

/** A failure that says nothing about the payload: retry later, don't diff. */
export function isTransientFailure(sample: RawSample): boolean {
  return sample.status === 429 || sample.status >= 500;
}

const BELOW = /\(\+(\d+) below\)$/;

/**
 * Paths per sign in the lines `diffSnapshots` returned. An unseen (`?`) line
 * counts its root plus the `(+N below)` paths under it.
 */
export function countPaths(
  lines: string[],
): Record<'+' | '-' | '~' | '?', number> {
  const counts = { '+': 0, '-': 0, '~': 0, '?': 0 };
  for (const line of lines) {
    const sign = line[0] as keyof typeof counts;
    counts[sign] += sign === '?' ? 1 + Number(BELOW.exec(line)?.[1] ?? 0) : 1;
  }
  return counts;
}

/** `+2 -1 ~3 ?14` for the lines `diffSnapshots` returned. */
export function summarize(lines: string[]): string {
  return Object.entries(countPaths(lines))
    .filter(([, count]) => count > 0)
    .map(([sign, count]) => `${sign}${count}`)
    .join(' ');
}

/**
 * `+` new paths, `-` removed required paths, `~` values that are not a subset
 * of the baseline's, and `?` unseen paths: missing ones the baseline marks
 * optional, the children of an unseen path or of one that lost the kind they
 * need, and the items of an array that came back empty. An unseen subtree
 * prints as its root with a `(+N below)` count. Values that are a subset of
 * the baseline's (fewer kinds, or no `?`) print nothing: the baseline is a
 * union across runs.
 */
export function diffSnapshots(
  name: string,
  before: Snapshot,
  after: Snapshot,
): string[] {
  const lines: string[] = [];

  for (const path of Object.keys(after)) {
    if (!(path in before)) {
      lines.push(`+ ${name} ${path}  ${after[path]}`);
    }
  }

  // Unseen path -> its unseen root; root -> paths below it.
  const unseenRoot = new Map<string, string>();
  const below = new Map<string, number>();
  const entries: Array<{ unseen: string } | { line: string }> = [];

  function markUnseen(path: string, parent: string | undefined) {
    const root = parent !== undefined ? unseenRoot.get(parent) : undefined;
    if (root === undefined) {
      unseenRoot.set(path, path);
      below.set(path, 0);
      entries.push({ unseen: path });
    } else {
      unseenRoot.set(path, root);
      below.set(root, (below.get(root) ?? 0) + 1);
    }
  }

  for (const path of Object.keys(before).sort(comparePaths)) {
    const parent = parentPath(path);
    const beforeValue = parseEntry(before[path]);

    if (!(path in after)) {
      const parentUnseen =
        parent !== undefined &&
        (unseenRoot.has(parent) ||
          (parent in after &&
            parent in before &&
            parseEntry(before[parent]).kinds.has(neededKind(path)) &&
            !parseEntry(after[parent]).kinds.has(neededKind(path))));

      if (beforeValue.optional || parentUnseen) {
        markUnseen(path, parent);
      } else {
        entries.push({ line: `- ${name} ${path}  ${before[path]}` });
      }
      continue;
    }

    if (before[path] === after[path]) {
      continue;
    }

    const afterValue = parseEntry(after[path]);

    if (
      path.endsWith('[]') &&
      afterValue.kinds.size === 0 &&
      beforeValue.kinds.size > 0
    ) {
      // The array came back empty in every sample.
      markUnseen(path, parent);
      continue;
    }
    if (
      isSubset(afterValue.kinds, beforeValue.kinds) &&
      (!afterValue.optional || beforeValue.optional)
    ) {
      continue;
    }

    entries.push({
      line: `~ ${name} ${path}  ${before[path]} -> ${after[path]} (${flipValue(beforeValue, afterValue)})`,
    });
  }

  for (const entry of entries) {
    if ('line' in entry) {
      lines.push(entry.line);
      continue;
    }

    const count = below.get(entry.unseen) ?? 0;

    lines.push(
      `? ${name} ${entry.unseen}  ${before[entry.unseen]}${count > 0 ? `  (+${count} below)` : ''}`,
    );
  }
  return lines;
}

/** Labels a `~` value that is not a subset of the baseline's. */
function flipValue(
  before: ReturnType<typeof parseEntry>,
  after: ReturnType<typeof parseEntry>,
) {
  switch (true) {
    case isSubset(after.kinds, before.kinds):
      return 'required -> optional';

    case isSubset(before.kinds, after.kinds):
      return 'kinds added';

    default:
      return 'kinds changed';
  }
}

/** `  stats  40 shape(s)` per module, for the terse skipped list. */
export function summarizeSkipped(skipped: Map<string, string>): string[] {
  const byModule = new Map<string, number>();

  for (const key of skipped.keys()) {
    const module = key.split('.')[0];
    byModule.set(module, (byModule.get(module) ?? 0) + 1);
  }

  return [...byModule].map(
    ([module, count]) => `  ${module}  ${count} shape(s)`,
  );
}

export interface DriftReport {
  /** Report lines: every drifted path, or one summary per shape when terse. */
  lines: string[];
  /** Counted `+`, `-` and `~` paths. */
  differences: number;
  /** Paths not in this run's samples (`?`); not counted in `differences`. */
  unseen: number;
  /** Shape key -> why it was not diffed. */
  skipped: Map<string, string>;
}

/** The shapes whose key starts with one of the `--only` prefixes. */
export function filterShapes(
  shapes: Map<string, ShapeNode>,
  only?: readonly string[],
): Map<string, ShapeNode> {
  return new Map([...shapes].filter(([key]) => matchesOnly(key, only)));
}

/**
 * The endpoints to refetch for `only`: the prefixes, plus every aliased
 * endpoint whose samples fold into a matching shape.
 */
export function fetchPrefixes(only: readonly string[]): string[] {
  const aliased = Object.entries(ALIASES)
    .filter(([, alias]) => {
      const key = alias.group
        ? `${alias.endpoint}.${alias.group}`
        : alias.endpoint;
      return (
        matchesOnly(key, only) ||
        only.some((prefix) => prefix.startsWith(`${key}.`))
      );
    })
    .map(([endpoint]) => endpoint);
  return [...new Set([...only, ...aliased])];
}

/**
 * Diffs the shapes inferred from `rawDir` against the snapshots in `shapesDir`.
 * With `only`, skipped and removed shapes outside the prefixes are left out too.
 */
export function driftReport(
  rawDir: string,
  shapes: Map<string, ShapeNode>,
  shapesDir: string,
  terse: boolean,
  only?: readonly string[],
): DriftReport {
  const skipped = new Map<string, string>();
  for (const [key, group] of groupAll(loadSamples(rawDir))) {
    if (!matchesOnly(key, only)) {
      continue;
    }
    const failures = group.samples.filter(isTransientFailure).length;
    if (failures > 0) {
      skipped.set(key, `${failures}/${group.samples.length} samples failed`);
    }
  }

  const committed = new Set(
    existsSync(shapesDir)
      ? readdirSync(shapesDir)
          .map((file) => file.replace(/\.json$/, ''))
          .filter((key) => matchesOnly(key, only))
      : [],
  );

  const lines: string[] = [];
  let differences = 0;
  let unseen = 0;

  for (const [key, shape] of shapes) {
    if (skipped.has(key)) {
      continue;
    }

    if (!committed.has(key)) {
      lines.push(`+ ${key}  (new endpoint shape)`);
      differences += 1;
      continue;
    }

    const before: Snapshot = JSON.parse(
      readFileSync(`${shapesDir}/${key}.json`, 'utf8'),
    );

    const diff = diffSnapshots(key, before, snapshot(shape));

    if (diff.length === 0) {
      continue;
    }

    const counts = countPaths(diff);
    differences += counts['+'] + counts['-'] + counts['~'];
    unseen += counts['?'];

    lines.push(...(terse ? [`  ${key}  ${summarize(diff)}`] : diff));
  }

  for (const key of committed) {
    if (!shapes.has(key) && !skipped.has(key)) {
      lines.push(`- ${key}  (shape no longer produced)`);
      differences += 1;
    }
  }

  return { lines, differences, unseen, skipped };
}

export interface AcceptResult {
  /** Shape key -> the snapshot to write. */
  writes: Map<string, Snapshot>;
  /** `+` paths added to existing shapes. */
  paths: number;
  /** Values widened (`required -> optional`, `kinds added`). */
  widened: number;
  /** Shapes with no committed file yet, written whole. */
  newShapes: number;
}

/**
 * What `--accept` writes to `shapesDir`: each shape's `+` paths and widened
 * values, merged add-only into its committed snapshot, and new shapes whole.
 * Skipped shapes and shapes no longer produced are left alone.
 */
export function acceptDrift(
  shapes: Map<string, ShapeNode>,
  shapesDir: string,
  skipped: Map<string, string>,
): AcceptResult {
  const result: AcceptResult = {
    writes: new Map(),
    paths: 0,
    widened: 0,
    newShapes: 0,
  };

  for (const [key, shape] of shapes) {
    if (skipped.has(key)) {
      continue;
    }
    const file = `${shapesDir}/${key}.json`;
    if (!existsSync(file)) {
      result.writes.set(key, snapshot(shape));
      result.newShapes += 1;
      continue;
    }

    const before: Snapshot = JSON.parse(readFileSync(file, 'utf8'));
    const merged = mergeSnapshots(before, snapshot(shape), {
      overwrite: false,
    });
    let paths = 0;
    let widened = 0;
    for (const path of Object.keys(merged)) {
      if (!(path in before)) {
        paths += 1;
      } else if (merged[path] !== before[path]) {
        widened += 1;
      }
    }
    if (paths + widened > 0) {
      result.writes.set(key, merged);
      result.paths += paths;
      result.widened += widened;
    }
  }

  return result;
}

function describeAccept(result: AcceptResult): string {
  return `${result.paths} path(s) and ${result.widened} value(s)${result.newShapes > 0 ? ` (plus ${result.newShapes} new shape(s))` : ''}`;
}

if (import.meta.main) {
  const terse = process.argv.includes('--terse');
  const only = optionValues('--only');

  const accept = process.argv.includes('--accept');

  if (only?.length === 0) {
    console.error(
      'usage: api-types:check [--terse] [--replay] [--accept] [--only <prefix>...]',
    );
    process.exit(2);
  }

  if (process.argv.includes('--replay')) {
    if (!existsSync(CHECK_RAW)) {
      console.error(
        'api-types:check: nothing to replay, run `pnpm api-types:check` first',
      );
      process.exit(1);
    }
  } else if (only) {
    // Keep the other endpoints' responses so a later --replay still covers them.
    const prefixes = fetchPrefixes(only);
    for (const endpoint of existsSync(CHECK_RAW)
      ? readdirSync(CHECK_RAW)
      : []) {
      if (matchesOnly(endpoint, prefixes)) {
        rmSync(`${CHECK_RAW}/${endpoint}`, { recursive: true, force: true });
      }
    }
    await runFetch(CHECK_RAW, { refresh: true, only: prefixes });
  } else {
    rmSync(`${CACHE_DIR}/check`, { recursive: true, force: true });
    await runFetch(CHECK_RAW, { refresh: true });
  }

  const shapes = filterShapes(inferAll(CHECK_RAW), only);

  if (only && shapes.size === 0) {
    console.error(`api-types:check: no shapes match --only ${only.join(' ')}`);
    process.exit(2);
  }

  const { lines, differences, unseen, skipped } = driftReport(
    CHECK_RAW,
    shapes,
    SHAPES_DIR,
    terse,
    only,
  );

  if (lines.length > 0) {
    console.log(lines.join('\n'));
  }

  if (skipped.size > 0) {
    console.log(
      `skipped (rate-limited or server error; not diffed, rerun later):\n${(
        terse
          ? summarizeSkipped(skipped)
          : [...skipped].map(([key, reason]) => `  ${key}  ${reason}`)
      ).join('\n')}`,
    );
  }

  const unseenNote = unseen > 0 ? `, ${unseen} unseen path(s)` : '';

  if (differences === 0) {
    console.error(
      `api-types:check: no shape drift${unseenNote}${skipped.size > 0 ? ` (${skipped.size} skipped)` : ''}`,
    );
  } else {
    console.error(
      `api-types:check: ${differences} shape difference(s)${unseenNote}, ${skipped.size} shape(s) skipped (information only${terse ? '; drop --terse to list every path' : ''})`,
    );
  }

  const accepted = acceptDrift(shapes, SHAPES_DIR, skipped);

  if (accept) {
    for (const [key, snap] of accepted.writes) {
      writeSnapshot(SHAPES_DIR, key, snap);
    }
    console.error(
      `api-types:check: accepted ${accepted.paths} path(s) and widened ${accepted.widened} value(s) in ${accepted.writes.size - accepted.newShapes} shape(s)${accepted.newShapes > 0 ? `, ${accepted.newShapes} new shape(s)` : ''}`,
    );
  } else if (accepted.writes.size > 0) {
    console.error(
      `api-types:check: ${describeAccept(accepted)} could be accepted with --accept`,
    );
  }

  // Drafts go to .api-types/check/draft/, beside the refetched samples.
  const errors = runConform({ raw: CHECK_RAW, shapes });
  process.exitCode = errors > 0 ? 1 : 0;
}
