/**
 * The codemod: sorts conform findings into tiers and turns the mechanical
 * ones into edits of `src/types/`.
 *
 *   auto     one correct edit, safe to write (`conform --fix --write`)
 *   propose  mechanical, but blast radius or evidence keeps it out of auto
 *   report   a design decision for a person (see the draft)
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename } from 'node:path';
import type { InterfaceDeclaration, Project, SourceFile } from 'ts-morph';
import {
  type ConformResult,
  declarationKey,
  type FieldEdit,
  type Finding,
  type FindingKind,
} from '#src/conformance.mjs';
import { quoteKey } from '#src/emit.mjs';

export type Tier = 'auto' | 'propose' | 'report';

const TIER_ORDER: Tier[] = ['report', 'propose', 'auto'];

/**
 * The best tier each finding kind can reach, and its evidence threshold.
 * The guards in `decide` only ever lower it. Move a kind between tiers here.
 */
export const FIX_POLICY: Record<
  FindingKind,
  { tier: Tier; minAbsentSamples?: number }
> = {
  'missing-field': { tier: 'auto' },
  'unexpected-null': { tier: 'auto' },
  'required-but-absent': { tier: 'auto', minAbsentSamples: 2 },
  'kind-mismatch': { tier: 'report' },
  'unknown-literal': { tier: 'report' },
  'new-literal': { tier: 'report' },
  'unknown-variant': { tier: 'report' },
  'unseen-field': { tier: 'report' },
  'unresolved-type': { tier: 'report' },
};

/** Interfaces that key a union or report rows; consumers augment them. */
export const REGISTRIES = new Set([
  'PlayTypes',
  'SkaterReportRows',
  'GoalieReportRows',
  'SkaterLeaderRows',
  'GoalieLeaderRows',
]);

/** Shared by every module, so never edited automatically. */
const SHARED_FILES = new Set(['common.mts']);

/** Names from `common.mts` that a new field's type text can use. */
const COMMON_NAMES = ['GameType', 'LocalizedString', 'OpenUnion'];
const COMMON_SPECIFIER = '#src/types/common.mjs';

export interface Decision {
  tier: Tier;
  /** Why it isn't auto. */
  reason?: string;
}

export function decide(
  finding: Finding,
  usage: ConformResult['usage'],
): Decision {
  const policy = FIX_POLICY[finding.kind];
  if (policy.tier === 'report') {
    return { tier: 'report' };
  }

  const target = finding.declaration;
  if (!target?.isInterface) {
    return { tier: 'report', reason: 'not declared in an interface' };
  }
  if (finding.kind === 'missing-field' && !finding.field?.typeText) {
    return { tier: 'report', reason: 'object or array value' };
  }
  if (finding.kind !== 'missing-field' && !target.property) {
    return { tier: 'report', reason: 'no property to edit' };
  }

  const groups = usage.get(declarationKey(target))?.size ?? 0;
  // Guards only lower a tier: auto becomes propose.
  function cap(reason: string): Decision {
    return { tier: 'propose', reason };
  }

  if (finding.evidence.snapshot) {
    return cap('snapshot evidence');
  }
  if (finding.confidence === 'low') {
    return cap('low confidence');
  }
  if (REGISTRIES.has(target.name)) {
    return cap('registry');
  }
  if (SHARED_FILES.has(basename(target.file))) {
    return cap(basename(target.file));
  }
  if (groups > 1) {
    return cap(`used by ${groups} groups`);
  }
  if (
    policy.minAbsentSamples !== undefined &&
    (finding.evidence.absentSamples ?? 0) < policy.minAbsentSamples
  ) {
    return cap(
      `absent in ${finding.evidence.absentSamples ?? 0} sample(s), needs ${policy.minAbsentSamples}`,
    );
  }
  return { tier: policy.tier };
}

/** One edit to one declaration, from every finding that asks for it. */
export interface Fix extends Decision {
  kind: 'missing-field' | 'unexpected-null' | 'required-but-absent';
  file: string;
  interface: string;
  property: string;
  field?: FieldEdit;
  findings: Finding[];
}

function lowest(left: Decision, right: Decision): Decision {
  return TIER_ORDER.indexOf(right.tier) < TIER_ORDER.indexOf(left.tier)
    ? right
    : left;
}

function mergeFields(left: FieldEdit, right: FieldEdit): FieldEdit {
  const types = new Set(
    [left.typeText, right.typeText].flatMap((text) => text?.split(' | ') ?? []),
  );
  const seenIn = [
    ...new Set([...(left.seenIn ?? []), ...(right.seenIn ?? [])]),
  ];
  const optional = left.optional || right.optional;
  return {
    ...left,
    typeText: [...types].join(' | '),
    optional,
    nullable: left.nullable || right.nullable,
    ...(optional && seenIn.length > 0 ? { seenIn } : {}),
  };
}

/** Decides every finding's tier and folds the fixable ones into one fix per declaration. */
export function planFixes(result: ConformResult): {
  decisions: Map<Finding, Decision>;
  fixes: Fix[];
} {
  const decisions = new Map<Finding, Decision>();
  const fixes = new Map<string, Fix>();

  for (const finding of result.findings) {
    const decision = decide(finding, result.usage);
    decisions.set(finding, decision);
    if (decision.tier === 'report' || !finding.declaration) {
      continue;
    }

    const kind = finding.kind as Fix['kind'];
    const property =
      kind === 'missing-field'
        ? (finding.field as FieldEdit).key
        : (finding.declaration.property as string);
    const key = `${kind}|${finding.declaration.file}|${finding.declaration.name}|${property}`;
    const existing = fixes.get(key);

    if (existing) {
      const merged = lowest(existing, decision);
      existing.tier = merged.tier;
      existing.reason = merged.reason;
      existing.findings.push(finding);
      if (existing.field && finding.field) {
        existing.field = mergeFields(existing.field, finding.field);
      }
      continue;
    }

    fixes.set(key, {
      ...decision,
      kind,
      file: finding.declaration.file,
      interface: finding.declaration.name,
      property,
      ...(finding.field ? { field: { ...finding.field } } : {}),
      findings: [finding],
    });
  }

  return { decisions, fixes: [...fixes.values()] };
}

function unquote(name: string): string {
  return name.replace(/^['"]|['"]$/g, '');
}

function propertyOf(target: InterfaceDeclaration, name: string) {
  return target
    .getProperties()
    .find((property) => unquote(property.getName()) === name);
}

function ensureCommonImports(file: SourceFile, typeText: string): void {
  if (SHARED_FILES.has(file.getBaseName())) {
    return;
  }
  const needed = COMMON_NAMES.filter((name) =>
    new RegExp(`\\b${name}\\b`).test(typeText),
  );
  if (needed.length === 0) {
    return;
  }
  const existing = file.getImportDeclaration(
    (declaration) => declaration.getModuleSpecifierValue() === COMMON_SPECIFIER,
  );
  const imported = new Set(
    existing?.getNamedImports().map((named) => named.getName()) ?? [],
  );
  const missing = needed.filter((name) => !imported.has(name));
  if (missing.length === 0) {
    return;
  }
  if (existing) {
    existing.addNamedImports(missing);
  } else {
    file.insertImportDeclaration(0, {
      isTypeOnly: true,
      moduleSpecifier: COMMON_SPECIFIER,
      namedImports: missing,
    });
  }
}

function applyFix(file: SourceFile, fix: Fix): boolean {
  const target = file.getInterface(fix.interface);
  if (!target) {
    return false;
  }

  if (fix.kind === 'missing-field') {
    const field = fix.field as FieldEdit;
    if (propertyOf(target, field.key) || !field.typeText) {
      return false;
    }
    const members = target.getMembers();
    let index = members.length;
    for (const key of [...field.before].reverse()) {
      const sibling = propertyOf(target, key);
      if (sibling) {
        index = members.indexOf(sibling) + 1;
        break;
      }
    }
    const typeText = `${field.typeText}${field.nullable ? ' | null' : ''}`;
    target.insertProperty(index, {
      name: quoteKey(field.key),
      type: typeText,
      hasQuestionToken: field.optional,
      ...(field.seenIn
        ? {
            leadingTrivia: `// TODO(conform): seen in ${field.seenIn.slice(0, 6).join('; ')}${field.seenIn.length > 6 ? '; ...' : ''}\n`,
          }
        : {}),
    });
    ensureCommonImports(file, typeText);
    return true;
  }

  const property = propertyOf(target, fix.property);
  if (!property) {
    return false;
  }

  if (fix.kind === 'unexpected-null') {
    const typeText = property.getTypeNode()?.getText();
    if (!typeText || /\bnull\b/.test(typeText)) {
      return false;
    }
    property.setType(
      /=>|\bextends\b/.test(typeText)
        ? `(${typeText}) | null`
        : `${typeText} | null`,
    );
    return true;
  }

  if (property.hasQuestionToken()) {
    return false;
  }
  property.setHasQuestionToken(true);
  return true;
}

export interface FileChange {
  /** Path relative to the SDK package. */
  file: string;
  before: string;
  after: string;
}

/** Applies fixes to the project's source files in memory; nothing is saved. */
export function applyFixes(
  project: Project,
  baseDir: string,
  fixes: Fix[],
): FileChange[] {
  const before = new Map<string, string>();
  for (const fix of fixes) {
    const file = project.getSourceFile(`${baseDir}${fix.file}`);
    if (!file) {
      continue;
    }
    if (!before.has(fix.file)) {
      before.set(fix.file, file.getFullText());
    }
    applyFix(file, fix);
  }

  return [...before]
    .map(([file, text]) => ({
      file,
      before: text,
      after: (
        project.getSourceFile(`${baseDir}${file}`) as SourceFile
      ).getFullText(),
    }))
    .filter((change) => change.before !== change.after);
}

/** A unified diff of one change, labelled with the file's path. */
export function unifiedDiff(change: FileChange, label = change.file): string {
  const dir = mkdtempSync(`${tmpdir()}/conform-`);
  try {
    writeFileSync(`${dir}/a`, change.before);
    writeFileSync(`${dir}/b`, change.after);
    const { stdout } = spawnSync(
      'git',
      ['diff', '--no-index', '--no-color', `${dir}/a`, `${dir}/b`],
      { encoding: 'utf8' },
    );
    return stdout
      .split('\n')
      .filter((line) => !/^(diff --git|index )/.test(line))
      .join('\n')
      .replace(/^--- .*$/m, `--- a/${label}`)
      .replace(/^\+\+\+ .*$/m, `+++ b/${label}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
