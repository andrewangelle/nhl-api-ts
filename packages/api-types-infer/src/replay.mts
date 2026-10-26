/**
 * History replay, a manual sanity check of the conform rules (never CI).
 * Runs conform in snapshot mode: the committed `shapes/` of one commit
 * against the SDK types of another, checked out with `git worktree`.
 * Snapshots keep only kinds and an optional flag, so only the kind, null,
 * presence and missing-field rules apply, and every finding is low confidence.
 *
 *   node --conditions=source src/replay.mts --types <rev> --shapes <rev>
 *     [--baseline <rev>] [--only <group>,<group>] [--fix]
 *
 * `--baseline <rev>` also runs the `shapes/` of that commit against the same
 * types and prints only the findings that differ between the two runs.
 * `--fix` prints the diffs the codemod would make (all propose, in snapshot mode).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { applyFixes, planFixes, unifiedDiff } from '#src/codemod.mjs';
import { type ConformResult, conformShapes } from '#src/conformance.mjs';
import { Declarations } from '#src/declarations.mjs';
import { SDK_DIR } from '#src/paths.mjs';
import { type ShapeNode, shapeFromSnapshot } from '#src/shape.mjs';

const REPO = `${SDK_DIR}../../`;
const SHAPES = 'packages/api-types-infer/shapes';

function git(...args: string[]): string {
  return execFileSync('git', args, {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
}

/** The committed shapes at `rev`, as shape trees. */
export function shapesAt(
  rev: string,
  only?: Set<string>,
): Map<string, ShapeNode> {
  const shapes = new Map<string, ShapeNode>();
  for (const path of git('ls-tree', '--name-only', `${rev}:${SHAPES}`)
    .split('\n')
    .filter((name) => name.endsWith('.json'))) {
    const group = path.replace(/\.json$/, '');
    if (only && !only.has(group)) {
      continue;
    }
    shapes.set(
      group,
      shapeFromSnapshot(JSON.parse(git('show', `${rev}:${SHAPES}/${path}`))),
    );
  }
  return shapes;
}

type Finding = ConformResult['findings'][number];

function keyOf(finding: Finding): string {
  return `${finding.severity} ${finding.kind} ${finding.group} ${finding.path}`;
}

function line(finding: Finding, prefix = ''): string {
  return `${prefix}${finding.severity} ${finding.kind} ${finding.group} ${finding.path}${finding.declaration ? `  (${finding.declaration.name}${finding.declaration.property ? `.${finding.declaration.property}` : ''})` : ''}`;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  function option(name: string): string | undefined {
    const index = args.indexOf(name);
    return index === -1 ? undefined : args[index + 1];
  }
  const typesRev = option('--types');
  const shapesRev = option('--shapes');
  const baselineRev = option('--baseline');
  const onlyList = option('--only');
  const only = onlyList ? new Set(onlyList.split(',')) : undefined;

  if (!typesRev || !shapesRev) {
    console.error(
      'usage: replay.mts --types <rev> --shapes <rev> [--baseline <rev>] [--only a,b] [--fix]',
    );
    process.exit(2);
  }

  const dir = mkdtempSync(`${tmpdir()}/conform-replay-`);
  const worktree = `${dir}/types`;
  git('worktree', 'add', '--detach', worktree, typesRev);

  try {
    const sdkDir = `${worktree}/packages/nhl-api-ts/`;
    const declarations = Declarations.fromSdk(sdkDir);
    const result = conformShapes(shapesAt(shapesRev, only), declarations, {
      snapshot: true,
    });
    const errors = result.findings.filter(
      (finding) => finding.severity === 'error',
    );
    console.error(
      `types ${typesRev}, shapes ${shapesRev}: ${errors.length} error(s), ${result.findings.length - errors.length} info (snapshot mode; error count is information only)`,
    );

    if (baselineRev) {
      const baseline = conformShapes(
        shapesAt(baselineRev, only),
        Declarations.fromSdk(sdkDir),
        { snapshot: true },
      );
      const current = new Set(result.findings.map(keyOf));
      const previous = new Set(baseline.findings.map(keyOf));
      for (const finding of baseline.findings) {
        if (!current.has(keyOf(finding))) {
          console.log(line(finding, `- (${baselineRev}) `));
        }
      }
      for (const finding of result.findings) {
        if (!previous.has(keyOf(finding))) {
          console.log(line(finding, `+ (${shapesRev}) `));
        }
      }
    } else {
      for (const finding of errors) {
        console.log(line(finding));
      }
    }

    if (args.includes('--fix')) {
      const { fixes } = planFixes(result);
      for (const change of applyFixes(declarations.project, sdkDir, fixes)) {
        console.log(unifiedDiff(change));
      }
    }
  } finally {
    git('worktree', 'remove', '--force', worktree);
    rmSync(dir, { recursive: true, force: true });
  }
}
