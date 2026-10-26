import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyFixes,
  decide,
  FIX_POLICY,
  planFixes,
  unifiedDiff,
} from '#src/codemod.mjs';
import {
  COMMON,
  conform,
  conformOne,
  type Run,
  samples,
} from './conform-helpers.mts';

/** Applies the fixes of `tier` and returns the edited text of `file`. */
function fixed(run: Run, file = 'index.mts', tier = 'auto'): string {
  const { fixes } = planFixes(run);
  const changes = applyFixes(
    run.declarations.project,
    run.declarations.baseDir,
    fixes.filter((fix) => fix.tier === tier),
  );
  const change = changes.find((entry) => entry.file === `src/types/${file}`);
  assert.ok(change, `no ${tier} change to ${file}`);
  return change.after;
}

function tiers(run: Run): string[] {
  const { decisions } = planFixes(run);
  return run.findings.map((finding) => {
    const decision = decisions.get(finding);
    return `${finding.kind} ${decision?.tier}${decision?.reason ? `: ${decision.reason}` : ''}`;
  });
}

const ROW = `export interface Row {
  /** The id */
  id: number;
  /** The name */
  name: string;
}
`;

describe('codemod: auto fixes', () => {
  it('adds a missing primitive field after its observed predecessor, keeping JSDoc', () => {
    const run = conformOne(ROW, 'Row', { id: 1, extra: 2, name: 'a' });
    assert.deepEqual(tiers(run), ['missing-field auto']);
    assert.equal(
      fixed(run),
      `export interface Row {
  /** The id */
  id: number;
  extra: number;
  /** The name */
  name: string;
}
`,
    );
  });

  it('makes a new field optional and nullable from the evidence', () => {
    const run = conformOne(
      ROW,
      'Row',
      { id: 1, name: 'a', extra: null },
      { id: 2, name: 'b', extra: 'x' },
      { id: 3, name: 'c' },
    );
    assert.match(fixed(run), /\n {2}extra\?: string \| null;\n/);
  });

  it('notes the tags an optional new field was seen in', () => {
    const run = conformOne(
      ROW,
      'Row',
      { id: 1, name: 'a' },
      {
        id: 2,
        name: 'b',
        extra: 'x',
      },
    );
    assert.match(
      fixed(run),
      /\n {2}\/\/ TODO\(conform\): seen in sample=1\n {2}extra\?: string;\n/,
    );
  });

  it('adds a localized field and imports LocalizedString', () => {
    const run = conformOne(
      {
        'common.mts': COMMON,
        'teams.mts': 'export interface Team {\n  id: number;\n}\n',
      },
      'Team',
      { id: 1, nick: { default: 'x', fr: 'y' } },
    );
    assert.deepEqual(tiers(run), ['missing-field auto']);
    assert.equal(
      fixed(run, 'teams.mts'),
      "import type { LocalizedString } from '#src/types/common.mjs';\n\nexport interface Team {\n  id: number;\n  nick: LocalizedString;\n}\n",
    );
  });

  it('appends | null to a field that was null', () => {
    const run = conformOne(ROW, 'Row', { id: 1, name: null });
    assert.deepEqual(tiers(run), ['unexpected-null auto']);
    assert.match(fixed(run), /\/\*\* The name \*\/\n {2}name: string \| null;/);
  });

  it('adds ? when the field is absent in two independent samples', () => {
    const run = conformOne(
      ROW,
      'Row',
      { id: 1, name: 'a' },
      { id: 2 },
      { id: 3 },
    );
    assert.deepEqual(tiers(run), ['required-but-absent auto']);
    assert.match(fixed(run), /\/\*\* The name \*\/\n {2}name\?: string;/);
  });

  it('prints a unified diff', () => {
    const run = conformOne(ROW, 'Row', { id: 1, name: null });
    const [change] = applyFixes(
      run.declarations.project,
      run.declarations.baseDir,
      planFixes(run).fixes,
    );
    assert.match(
      unifiedDiff(change),
      /^--- a\/src\/types\/index\.mts\n\+\+\+ b\/src\/types\/index\.mts\n@@ [^\n]+\n[\s\S]*- {2}name: string;\n\+ {2}name: string \| null;/,
    );
  });
});

describe('codemod: tier guards', () => {
  it('a shared interface is not auto', () => {
    const run = conform(ROW, 'Row', {
      'one.group': samples({ id: 1, name: null }),
      'two.group': samples({ id: 2, name: 'b' }),
    });
    assert.deepEqual(tiers(run), ['unexpected-null propose: used by 2 groups']);
    assert.match(fixed(run, 'index.mts', 'propose'), /name: string \| null;/);
  });

  it('common.mts is not auto', () => {
    const run = conformOne(
      { 'common.mts': `${COMMON}export interface Outcome { period: number }` },
      'Outcome',
      { period: 1, ot: 2 },
    );
    assert.deepEqual(tiers(run), ['missing-field propose: common.mts']);
  });

  it('a registry is not auto', () => {
    const run = conformOne(
      'export interface Summary { goals: number } export interface SkaterReportRows { summary: Summary }',
      'SkaterReportRows',
      { summary: { goals: 1 }, realtime: 2 },
    );
    assert.deepEqual(tiers(run), ['missing-field propose: registry']);
  });

  it('a single-sample absence is not auto', () => {
    const run = conformOne(ROW, 'Row', { id: 1, name: 'a' }, { id: 2 });
    assert.deepEqual(tiers(run), [
      'required-but-absent propose: absent in 1 sample(s), needs 2',
    ]);
  });

  it('two elements from one raw sample are one sample, so not auto', () => {
    const run = conformOne(
      `${ROW}export interface Page { rows: Row[] }`,
      'Page',
      { rows: [{ id: 1, name: 'a' }, { id: 2 }, { id: 3 }] },
    );
    assert.deepEqual(tiers(run), [
      'required-but-absent propose: absent in 1 sample(s), needs 2',
    ]);
  });

  it('two elements of one union member from one raw sample are one sample', () => {
    const run = conformOne(
      `export interface Goal { typeDescKey: 'goal'; assist: number }
       export interface Hit { typeDescKey: 'hit' }
       export interface Game { plays: (Goal | Hit)[] }`,
      'Game',
      {
        plays: [
          { typeDescKey: 'goal' },
          { typeDescKey: 'goal' },
          { typeDescKey: 'goal', assist: 1 },
          { typeDescKey: 'hit' },
        ],
      },
    );
    assert.deepEqual(tiers(run), [
      'required-but-absent propose: absent in 1 sample(s), needs 2',
    ]);
  });

  it('an object-typed new field is a report line', () => {
    const run = conformOne(ROW, 'Row', {
      id: 1,
      name: 'a',
      venue: { city: 'x' },
    });
    assert.deepEqual(tiers(run), [
      'missing-field report: object or array value',
    ]);
  });

  it('a field missing from an unsplit union is a report line', () => {
    const run = conformOne(
      'export interface A { x: number } export interface B { y: number } export interface Row { p: A | B }',
      'Row',
      { p: { x: 1, z: 2 } },
    );
    const missing = run.findings.filter(
      (finding) => finding.kind === 'missing-field',
    );
    assert.equal(missing.length, 1);
    assert.deepEqual(decide(missing[0], run.usage), {
      tier: 'report',
      reason: 'not declared in an interface',
    });
  });

  it('design decisions are report lines', () => {
    for (const kind of [
      'kind-mismatch',
      'unknown-literal',
      'unknown-variant',
      'unresolved-type',
    ] as const) {
      assert.equal(FIX_POLICY[kind].tier, 'report');
    }
    const run = conformOne(ROW, 'Row', { id: 'x', name: 'a' });
    assert.equal(decide(run.findings[0], run.usage).tier, 'report');
  });
});
