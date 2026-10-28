/**
 * Checks the cached raw samples against the declared SDK types in
 * `nhl-api-ts/src/types/` and prints the mismatches, grouped by declaration.
 * Exits 1 when any error-severity finding remains. Also regenerates the
 * drafts beside the raw dir, so report lines point at drafts from the same
 * samples.
 *
 *   pnpm api-types:conform [--raw <dir>] [--json] [--verbose] [--fix [--write]]
 *
 * `--fix` prints diffs for the auto and propose tiers; `--write` applies the
 * auto tier, formats the touched files and checks again.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import {
  applyFixes,
  type Decision,
  type FileChange,
  planFixes,
  unifiedDiff,
} from '#src/codemod.mjs';
import {
  type ConformResult,
  conformShapes,
  declarationKey,
  type Finding,
} from '#src/conformance.mjs';
import { Declarations } from '#src/declarations.mjs';
import { draftFor, inferAll } from '#src/infer.mjs';
import { RAW_DIR, SDK_DIR } from '#src/paths.mjs';
import type { ShapeNode } from '#src/shape.mjs';

const RECIPE = 'docs/recipes/add-a-response-type.md';

export const REGENERATE =
  'pnpm openapi:schemas && pnpm api-types:fixtures && pnpm typecheck:test && pnpm typecheck:types && pnpm api:report && pnpm docs:llms';

export interface ConformOptions {
  raw: string;
  /** Shapes already inferred from `raw`, to skip inferring them again. */
  shapes?: Map<string, ShapeNode>;
  json?: boolean;
  verbose?: boolean;
  fix?: boolean;
  write?: boolean;
  out?: (text: string) => void;
  err?: (text: string) => void;
}

/** The `draft/` dir beside a raw dir: `.api-types/draft/` for `.api-types/raw/`. */
export function draftDirFor(raw: string): string {
  return `${dirname(raw.replace(/\/+$/, ''))}/draft`;
}

/** Writes every group's draft beside `raw`, as `infer` does; infers the shapes unless given. */
export function writeDrafts(
  raw: string,
  shapes: Map<string, ShapeNode> = inferAll(raw),
): Map<string, ShapeNode> {
  const draftDir = draftDirFor(raw);
  mkdirSync(draftDir, { recursive: true });

  for (const [group, shape] of shapes) {
    writeFileSync(`${draftDir}/${group}.mts`, draftFor(group, shape));
  }

  return shapes;
}

function findingKey(finding: Finding): string {
  return `${finding.kind}|${finding.group}|${finding.path}`;
}

function shown(path: string): string {
  return relative(process.cwd(), path) || '.';
}

function describe(finding: Finding): string {
  const { evidence } = finding;
  const parts: string[] = [];

  if (evidence.kinds) {
    parts.push(
      Object.entries(evidence.kinds)
        .map(([kind, count]) => `${kind}(${count})`)
        .join('|'),
    );
  }

  if (evidence.declared) {
    parts.push(`declared ${evidence.declared}`);
  }

  if (evidence.present !== undefined && evidence.objects !== undefined) {
    parts.push(`in ${evidence.present}/${evidence.objects} objects`);
  }

  if (evidence.absentSamples !== undefined && evidence.samples !== undefined) {
    parts.push(
      `absent in ${evidence.absentSamples}/${evidence.samples} samples`,
    );
  }

  if (evidence.values) {
    parts.push(
      `values ${evidence.values.map((value) => JSON.stringify(value)).join(', ')}${evidence.overflow ? ', ...' : ''}`,
    );
  }

  if (evidence.missingIn) {
    parts.push(`missing when ${evidence.missingIn.slice(0, 4).join('; ')}`);
  }

  if (finding.kind === 'unknown-variant' && evidence.objects !== undefined) {
    parts.push(`${evidence.objects} elements in ${evidence.samples} samples`);
  }

  if (evidence.snapshot) {
    parts.push('snapshot');
  }

  if (evidence.capped) {
    parts.push('element cap hit');
  }

  return parts.join(', ');
}

function tierText(decision: Decision): string {
  return decision.reason
    ? `[${decision.tier}: ${decision.reason}]`
    : `[${decision.tier}]`;
}

/** Human-readable findings grouped by declaration; info findings are counted unless `verbose`. */
export function formatFindings(
  result: ConformResult,
  decisions: Map<Finding, Decision>,
  options: { draftDir: string; verbose?: boolean },
): string[] {
  const byDeclaration = new Map<string, Finding[]>();

  for (const finding of result.findings) {
    const key = finding.declaration
      ? declarationKey(finding.declaration)
      : `(${finding.group})`;

    byDeclaration.set(key, [...(byDeclaration.get(key) ?? []), finding]);
  }

  const lines: string[] = [];

  for (const [key, findings] of [...byDeclaration].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const listed = options.verbose
      ? findings
      : findings.filter(
          (finding) =>
            finding.severity === 'error' || finding.kind === 'new-literal',
        );

    const hidden = findings.length - listed.length;

    if (listed.length === 0 && !options.verbose) {
      continue;
    }

    const declaration = findings[0].declaration;
    const groups = result.usage.get(key)?.size;

    lines.push(
      declaration
        ? `${declaration.name}  ${shown(`${SDK_DIR}${declaration.file}`)}:${declaration.line}${groups ? `  (${groups} group${groups === 1 ? '' : 's'})` : ''}`
        : key,
    );

    for (const finding of listed) {
      const decision = decisions.get(finding) as Decision;

      const draft =
        decision.tier === 'report' && finding.severity === 'error'
          ? `  draft: ${shown(`${options.draftDir}/${finding.group}.mts`)}`
          : '';

      lines.push(
        `  ${finding.severity.padEnd(5)} ${finding.kind}  ${finding.group} ${finding.path}  ${describe(finding)}  ${tierText(decision)}${draft}`,
      );
    }

    if (hidden > 0) {
      const kinds = [
        ...new Set(
          findings
            .filter((finding) => !listed.includes(finding))
            .map((finding) => finding.kind),
        ),
      ];

      lines.push(
        `  info  ${hidden} more (${kinds.join(', ')}); --verbose lists them`,
      );
    }
  }

  return lines;
}

function errorsOf(result: ConformResult): Finding[] {
  return result.findings.filter((finding) => finding.severity === 'error');
}

function diffs(changes: FileChange[]): string {
  return changes
    .map((change) => unifiedDiff(change, shown(`${SDK_DIR}${change.file}`)))
    .join('\n');
}

/** Runs conform; returns the number of error findings left. */
export function runConform(options: ConformOptions): number {
  const out = options.out ?? ((text: string) => console.log(text));
  const err = options.err ?? ((text: string) => console.error(text));
  const draftDir = draftDirFor(options.raw);

  const shapes = writeDrafts(options.raw, options.shapes);
  const declarations = Declarations.fromSdk(SDK_DIR);
  const result = conformShapes(shapes, declarations);
  const { decisions, fixes } = planFixes(result);
  const errors = errorsOf(result);

  if (options.json) {
    out(
      JSON.stringify(
        {
          raw: shown(options.raw),
          findings: result.findings.map((finding) => ({
            ...finding,
            ...decisions.get(finding),
          })),
          usage: Object.fromEntries(
            [...result.usage].map(([key, groups]) => [key, [...groups].sort()]),
          ),
        },
        null,
        2,
      ),
    );
  } else {
    out(
      formatFindings(result, decisions, {
        draftDir,
        verbose: options.verbose,
      }).join('\n'),
    );
  }

  const auto = fixes.filter((fix) => fix.tier === 'auto');
  const propose = fixes.filter((fix) => fix.tier === 'propose');
  const reported = result.findings.filter(
    (finding) =>
      finding.severity === 'error' && decisions.get(finding)?.tier === 'report',
  );

  err(
    `api-types:conform: ${shapes.size} groups, ${errors.length} error(s), ${result.findings.length - errors.length} info; fixes: ${auto.length} auto, ${propose.length} propose; ${reported.length} error(s) to report`,
  );

  if (reported.length > 0) {
    err(
      `Report-tier errors are design decisions: see ${RECIPE} and the drafts in ${shown(draftDir)}/`,
    );
  }

  if (!options.fix) {
    return errors.length;
  }

  const print = options.json ? err : out;

  // Conform only added its probe file, so its project takes the auto edits;
  // propose needs a fresh one, without them.
  const changes = applyFixes(declarations.project, SDK_DIR, auto);

  if (auto.length > 0) {
    print(
      `# auto (${auto.length})${options.write ? '' : ', dry run: pass --write to apply'}`,
    );
    print(diffs(changes));
  }

  if (propose.length > 0) {
    print(`# propose (${propose.length}), never applied`);
    for (const fix of propose) {
      print(`# ${fix.interface}.${fix.property} ${fix.kind}: ${fix.reason}`);
    }
    print(
      diffs(
        applyFixes(Declarations.fromSdk(SDK_DIR).project, SDK_DIR, propose),
      ),
    );
  }

  if (!options.write || auto.length === 0) {
    return errors.length;
  }

  for (const change of changes) {
    writeFileSync(`${SDK_DIR}${change.file}`, change.after);
  }

  const files = changes.map((change) => `${SDK_DIR}${change.file}`);
  spawnSync('pnpm', ['exec', 'biome', 'check', '--write', ...files], {
    cwd: `${SDK_DIR}../..`,
    stdio: 'inherit',
  });
  err(`wrote ${files.map(shown).join(', ')}`);

  const after = conformShapes(shapes, Declarations.fromSdk(SDK_DIR));
  const remaining = new Set(errorsOf(after).map(findingKey));
  const before = new Set(errors.map(findingKey));
  const unfixed = auto
    .flatMap((fix) => fix.findings)
    .filter((finding) => remaining.has(findingKey(finding)));
  const added = errorsOf(after).filter(
    (finding) => !before.has(findingKey(finding)),
  );

  for (const finding of unfixed) {
    err(`  still failing: ${finding.kind} ${finding.group} ${finding.path}`);
  }

  for (const finding of added) {
    err(`  new error: ${finding.kind} ${finding.group} ${finding.path}`);
  }

  err(
    unfixed.length === 0 && added.length === 0
      ? 'recheck: every auto fix is gone and no new errors appeared'
      : `recheck failed: ${unfixed.length} unfixed, ${added.length} new`,
  );
  err(`next: ${REGENERATE}`);

  return remaining.size;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf('--raw');
  const errors = runConform({
    raw: rawIndex === -1 ? RAW_DIR : args[rawIndex + 1],
    json: args.includes('--json'),
    verbose: args.includes('--verbose'),
    fix: args.includes('--fix'),
    write: args.includes('--write'),
  });

  process.exitCode = errors > 0 ? 1 : 0;
}
