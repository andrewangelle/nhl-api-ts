/**
 * Drift check: refetches the sample matrix into `.api-types/check/raw`, then
 * runs conform on it against the SDK types and exits 1 on its errors. Also
 * diffs the re-inferred shapes against the committed snapshots in `shapes/`
 * (new fields, removed fields, required <-> optional flips) as information.
 * Manual only; run it before each release.
 *
 * Lists every drifted path; `--terse` prints one `+N -N ~N` line per shape.
 * `--replay` skips the refetch and reports on the responses the last run left
 * in `.api-types/check/raw`, against the current `shapes/` and SDK types.
 * A shape with a sample that was rate-limited or hit a server error is not
 * diffed (its missing fields would read as removed) and is listed as skipped.
 * `--only <prefix>...` limits the refetch, the diff and conform to the shapes
 * whose key starts with one of the prefixes, e.g. `--only edge gameCenter`.
 *
 *   pnpm api-types:check [--terse] [--replay] [--only <prefix>...]
 */
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { runConform } from '#src/conform.mjs';
import { matchesOnly, optionValues, runFetch } from '#src/fetch.mjs';
import { groupAll, inferAll } from '#src/infer.mjs';
import { loadSamples, type RawSample } from '#src/load.mjs';
import { CACHE_DIR, SHAPES_DIR } from '#src/paths.mjs';
import { type ShapeNode, type Snapshot, snapshot } from '#src/shape.mjs';
import { ALIASES } from '#src/specs.mjs';

const CHECK_RAW = `${CACHE_DIR}/check/raw`;

/** A failure that says nothing about the payload: retry later, don't diff. */
export function isTransientFailure(sample: RawSample): boolean {
  return sample.status === 429 || sample.status >= 500;
}

/** `+2 -1 ~3` for the lines `diffSnapshots` returned. */
export function summarize(lines: string[]): string {
  const counts = { '+': 0, '-': 0, '~': 0 };
  for (const line of lines) {
    counts[line[0] as keyof typeof counts] += 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([sign, count]) => `${sign}${count}`)
    .join(' ');
}

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

  for (const path of Object.keys(before)) {
    if (!(path in after)) {
      lines.push(`- ${name} ${path}  ${before[path]}`);
    } else if (before[path] !== after[path]) {
      const flip = flipValue(before[path], after[path]);

      lines.push(
        `~ ${name} ${path}  ${before[path]} -> ${after[path]} (${flip})`,
      );
    }
  }
  return lines;
}

function flipValue(before: string, after: string) {
  if (before.replace('?', '') === after.replace('?', '')) {
    if (before.endsWith('?')) {
      return 'optional -> required';
    }
    return 'required -> optional';
  }

  return 'kinds changed';
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
  differences: number;
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

    differences += diff.length;

    lines.push(...(terse ? [`  ${key}  ${summarize(diff)}`] : diff));
  }

  for (const key of committed) {
    if (!shapes.has(key) && !skipped.has(key)) {
      lines.push(`- ${key}  (shape no longer produced)`);
      differences += 1;
    }
  }

  return { lines, differences, skipped };
}

if (import.meta.main) {
  const terse = process.argv.includes('--terse');
  const only = optionValues('--only');

  if (only?.length === 0) {
    console.error(
      'usage: api-types:check [--terse] [--replay] [--only <prefix>...]',
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

  const { lines, differences, skipped } = driftReport(
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

  if (differences === 0) {
    console.error(
      `api-types:check: no shape drift${skipped.size > 0 ? ` (${skipped.size} skipped)` : ''}`,
    );
  } else {
    console.error(
      `api-types:check: ${differences} shape difference(s), ${skipped.size} shape(s) skipped (information only${terse ? '; drop --terse to list every path' : ''})`,
    );
  }

  // Drafts go to .api-types/check/draft/, beside the refetched samples.
  const errors = runConform({ raw: CHECK_RAW, shapes });
  process.exitCode = errors > 0 ? 1 : 0;
}
