/**
 * Drift check: refetches the sample matrix into `.probe/check/raw`, re-infers
 * every shape and diffs it against the committed snapshots in
 * `scripts/probe/shapes/`. Prints new fields, removed fields and
 * required <-> optional flips, and exits 1 when anything changed.
 * Manual only; run it before each release.
 *
 *   pnpm probe:check
 */
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { runFetch } from '#probe/fetch.mjs';
import { groupAll } from '#probe/infer.mjs';
import { buildShape, loadSamples } from '#probe/load.mjs';
import { PROBE_DIR, SHAPES_DIR } from '#probe/paths.mjs';
import { type Snapshot, snapshot } from '#probe/shape.mjs';
import { specFor } from '#probe/specs.mjs';

const CHECK_RAW = `${PROBE_DIR}/check/raw`;

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
      function flipValue() {
        if (before[path].replace('?', '') === after[path].replace('?', '')) {
          if (before[path].endsWith('?')) {
            return 'optional -> required';
          }
          return 'required -> optional';
        }

        return 'kinds changed';
      }

      const flip = flipValue();

      lines.push(
        `~ ${name} ${path}  ${before[path]} -> ${after[path]} (${flip})`,
      );
    }
  }
  return lines;
}

if (import.meta.main) {
  rmSync(`${PROBE_DIR}/check`, { recursive: true, force: true });
  await runFetch(CHECK_RAW, { refresh: true });

  const current = new Map<string, Snapshot>();
  for (const [key, group] of groupAll(loadSamples(CHECK_RAW))) {
    current.set(
      key,
      snapshot(buildShape(group.samples, specFor(group.endpoint).unwrap)),
    );
  }

  const committed = new Set(
    existsSync(SHAPES_DIR)
      ? readdirSync(SHAPES_DIR).map((file) => file.replace(/\.json$/, ''))
      : [],
  );

  const report: string[] = [];
  for (const [key, after] of current) {
    if (!committed.has(key)) {
      report.push(`+ ${key}  (new endpoint shape)`);
      continue;
    }

    const before: Snapshot = JSON.parse(
      readFileSync(`${SHAPES_DIR}/${key}.json`, 'utf8'),
    );

    report.push(...diffSnapshots(key, before, after));
  }

  for (const key of committed) {
    if (!current.has(key)) {
      report.push(`- ${key}  (shape no longer produced)`);
    }
  }

  if (report.length === 0) {
    console.error('probe:check: no drift');
  } else {
    console.log(report.join('\n'));
    console.error(`probe:check: ${report.length} difference(s)`);
    process.exitCode = 1;
  }
}
