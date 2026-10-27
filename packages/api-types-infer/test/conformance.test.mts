import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { conformShapes } from '#src/conformance.mjs';
import { Declarations } from '#src/declarations.mjs';
import { buildShape } from '#src/load.mjs';
import { SDK_DIR } from '#src/paths.mjs';
import { shapeFromSnapshot, snapshot } from '#src/shape.mjs';
import { ALIASES, declaredTypeFor, SPECS } from '#src/specs.mjs';
import {
  COMMON,
  conformOne,
  errors,
  samples,
  summary,
} from './conform-helpers.mts';

describe('conform: drift that needs no type change', () => {
  it('localized-key churn', () => {
    const run = conformOne(
      `${COMMON}export interface Player { name: LocalizedString }`,
      'Player',
      { name: { default: 'A', fr: 'A' } },
      { name: { default: 'B', cs: 'B' } },
    );
    assert.deepEqual(summary(run), []);
  });

  it('integer <-> float', () => {
    const run = conformOne(
      'export interface Row { value: number }',
      'Row',
      { value: 1 },
      { value: 1.5 },
    );
    assert.deepEqual(summary(run), []);
  });

  it('an optional field that comes and goes', () => {
    const run = conformOne(
      'export interface Row { id: number; note?: string }',
      'Row',
      { id: 1, note: 'x' },
      { id: 2 },
    );
    assert.deepEqual(summary(run), []);
  });

  it('a new value in an open union is info only', () => {
    const run = conformOne(
      `${COMMON}export interface Game { state: OpenUnion<'FUT' | 'LIVE'> }`,
      'Game',
      { state: 'FUT' },
      { state: 'OFF' },
    );
    assert.deepEqual(summary(run), ['new-literal .state']);
    assert.deepEqual(errors(run), []);
    assert.deepEqual(run.findings[0].evidence.values, ['OFF']);
  });

  it('an open numeric union accepts other codes', () => {
    const run = conformOne(
      'export type GameType = 1 | 2 | (number & {}); export interface Game { gameType: GameType }',
      'Game',
      { gameType: 2 },
      { gameType: 4 },
    );
    assert.deepEqual(errors(run), []);
  });
});

describe('conform: each finding kind', () => {
  it('unexpected-null, pointing at the property', () => {
    const run = conformOne(
      'export interface Row {\n  id: number;\n  name: string;\n}',
      'Row',
      { id: 1, name: null },
    );
    assert.deepEqual(summary(run), ['unexpected-null .name']);
    assert.equal(run.findings[0].severity, 'error');
    assert.deepEqual(run.findings[0].declaration, {
      name: 'Row',
      file: 'src/types/index.mts',
      line: 3,
      property: 'name',
      isInterface: true,
    });
  });

  it('kind-mismatch', () => {
    const run = conformOne('export interface Row { id: number }', 'Row', {
      id: 'x',
    });
    assert.deepEqual(summary(run), ['kind-mismatch .id']);
    assert.equal(run.findings[0].evidence.declared, 'number');
  });

  it('unknown-literal in a closed union', () => {
    const run = conformOne(
      "export interface Row { side: 'left' | 'right' }",
      'Row',
      { side: 'left' },
      { side: 'center' },
    );
    assert.deepEqual(summary(run), ['unknown-literal .side']);
    assert.deepEqual(run.findings[0].evidence.values, ['center']);
  });

  it('missing-field', () => {
    const run = conformOne('export interface Row { id: number }', 'Row', {
      id: 1,
      extra: 'x',
    });
    assert.deepEqual(summary(run), ['missing-field .extra']);
    assert.deepEqual(run.findings[0].field, {
      key: 'extra',
      typeText: 'string',
      optional: false,
      nullable: false,
      before: ['id'],
    });
  });

  it('required-but-absent', () => {
    const run = conformOne(
      'export interface Row { id: number; name: string }',
      'Row',
      { id: 1, name: 'a' },
      { id: 2 },
    );
    assert.deepEqual(summary(run), ['required-but-absent .name']);
    assert.equal(run.findings[0].evidence.absentSamples, 1);
  });

  it('unknown-variant of a discriminated union', () => {
    const run = conformOne(
      `export interface Goal { typeDescKey: 'goal'; scorer: number }
       export interface Hit { typeDescKey: 'hit'; hitter: number }
       export interface Game { plays: (Goal | Hit)[] }`,
      'Game',
      {
        plays: [
          { typeDescKey: 'goal', scorer: 1 },
          { typeDescKey: 'hit', hitter: 2 },
          { typeDescKey: 'faceoff', winner: 3 },
        ],
      },
    );
    assert.deepEqual(summary(run), ['unknown-variant .plays[]<faceoff>']);
  });

  it('splits a union by discriminant, so each member is checked on its own', () => {
    const run = conformOne(
      `export interface Goal { typeDescKey: 'goal'; scorer: number }
       export interface Hit { typeDescKey: 'hit'; hitter: number }
       export interface Game { plays: (Goal | Hit)[] }`,
      'Game',
      {
        plays: [
          { typeDescKey: 'goal', scorer: 1 },
          { typeDescKey: 'hit', hitter: 2, scorer: 3 },
        ],
      },
    );
    assert.deepEqual(summary(run), ['missing-field .plays[]<hit>.scorer']);
    assert.equal(run.findings[0].declaration?.name, 'Hit');
  });

  it('a union without a discriminant uses the loose rule', () => {
    const run = conformOne(
      'export interface A { x: number; y: string } export interface B { x: number } export interface Row { p: A | B }',
      'Row',
      { p: { x: 1 } },
      { p: { x: 2, y: 'a', z: true } },
    );
    assert.deepEqual(
      errors(run).map((finding) => `${finding.kind} ${finding.path}`),
      ['missing-field .p.z'],
    );
    assert.equal(errors(run)[0].declaration?.name, 'A | B');
    assert.equal(errors(run)[0].declaration?.isInterface, false);
  });

  it('unseen-field is info only', () => {
    const run = conformOne(
      'export interface Row { id: number; note?: string }',
      'Row',
      { id: 1 },
    );
    assert.deepEqual(summary(run), ['unseen-field .note']);
    assert.equal(run.findings[0].severity, 'info');
  });

  it('a required field never seen is required-but-absent', () => {
    const run = conformOne(
      'export interface Row { id: number; gone: string }',
      'Row',
      { id: 1 },
      { id: 2 },
    );
    assert.deepEqual(summary(run), ['required-but-absent .gone']);
    assert.equal(run.findings[0].evidence.absentSamples, 2);
  });

  it('unresolved-type', () => {
    const declarations = Declarations.fromSource('export interface Other {}');
    const shapes = new Map([
      ['teams.nope', buildShape(samples({ id: 1 }), undefined)],
    ]);
    const run = conformShapes(shapes, declarations);
    assert.deepEqual(summary(run), ['unresolved-type $']);
    assert.match(run.findings[0].evidence.declared ?? '', /^Nope: /);
  });

  it('walks every key of a string index signature against its value type', () => {
    const run = conformOne(
      'export interface Day { games: number } export interface Calendar { days: Record<string, Day> }',
      'Calendar',
      { days: { '2024-01-01': { games: 1 }, '2024-01-02': { games: 'x' } } },
    );
    assert.deepEqual(summary(run), ['kind-mismatch .days.2024-01-02.games']);
  });

  it('records which groups reach each interface', () => {
    const run = conformOne(
      'export interface Team { id: number } export interface Game { home: Team; away: Team }',
      'Game',
      { home: { id: 1 }, away: { id: 2 } },
    );
    assert.deepEqual(
      [...run.usage].map(([key, groups]) => [key, [...groups]]),
      [
        ['src/types/index.mts#Game', ['test.group']],
        ['src/types/index.mts#Team', ['test.group']],
      ],
    );
  });
});

describe('conform: evidence', () => {
  it('two elements from one raw sample count as one sample', () => {
    const run = conformOne(
      'export interface Row { id: number; note: string } export interface Page { rows: Row[] }',
      'Page',
      { rows: [{ id: 1, note: 'a' }, { id: 2 }, { id: 3 }] },
    );
    assert.deepEqual(summary(run), ['required-but-absent .rows[].note']);
    assert.equal(run.findings[0].evidence.absentSamples, 1);
  });

  it('counts samples, not elements, inside a union member', () => {
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
      { plays: [{ typeDescKey: 'goal', assist: 2 }] },
    );
    assert.deepEqual(summary(run), [
      'required-but-absent .plays[]<goal>.assist',
    ]);
    assert.equal(run.findings[0].evidence.absentSamples, 1);
    assert.equal(run.findings[0].evidence.samples, 2);
  });

  it('a sometimes-null parent does not make its children absent', () => {
    const run = conformOne(
      'export interface Inner { id: number } export interface Row { inner: Inner | null }',
      'Row',
      { inner: null },
      { inner: { id: 1 } },
    );
    assert.deepEqual(summary(run), []);
  });

  it('absences in a sample before a field first appears still count', () => {
    const run = conformOne(
      'export interface Row { id: number; late: string }',
      'Row',
      { id: 1 },
      { id: 2 },
      { id: 3, late: 'x' },
    );
    assert.deepEqual(summary(run), ['required-but-absent .late']);
    assert.equal(run.findings[0].evidence.absentSamples, 2);
  });
});

describe('snapshot mode', () => {
  it('rebuilds a shape that snapshots back to the same entries', () => {
    const snap = {
      $: 'object',
      '.a': 'object?',
      '.a.b': 'string?',
      '.a.c': 'null|string',
      '.list': 'array',
      '.list[]': 'object',
      '.list[].id': 'integer',
      '.list[].note': 'string?',
    };
    assert.deepEqual(snapshot(shapeFromSnapshot(snap)), snap);
  });

  it('marks its findings as snapshot evidence with low confidence', () => {
    const declarations = Declarations.fromSource(
      'export interface Roster { id: number; name: string }',
    );
    const shapes = new Map([
      [
        'teams.teamRoster',
        shapeFromSnapshot({
          $: 'object',
          '.id': 'integer',
          '.name': 'string?',
        }),
      ],
    ]);
    const run = conformShapes(shapes, declarations, { snapshot: true });
    assert.deepEqual(summary(run), ['required-but-absent .name']);
    assert.equal(run.findings[0].confidence, 'low');
    assert.equal(run.findings[0].evidence.snapshot, true);
  });
});

describe('endpoint -> type mapping', () => {
  it('every spec and alias target names a type the SDK exports', () => {
    // A grouped endpoint has no type of its own, only one per group.
    const representative: Record<string, string> = {
      'stats.skaterLeaders': 'points',
      'stats.goalieLeaders': 'gaa',
      'stats.skaterStatsWithQueryContext': 'summary',
      'stats.goalieStatsSummary': 'summary',
    };
    const endpoints = [
      ...Object.keys(SPECS),
      ...Object.values(ALIASES).map((alias) => alias.endpoint),
    ];
    const expressions = endpoints.map((endpoint) =>
      SPECS[endpoint]?.groupBy
        ? declaredTypeFor(`${endpoint}.${representative[endpoint]}`)
        : declaredTypeFor(endpoint),
    );
    const resolved = Declarations.fromSdk(SDK_DIR).resolve(expressions);
    const failed = [...resolved.values()].filter((entry) => entry.error);
    assert.deepEqual(failed, []);
  });

  it('indexes registries for grouped endpoints', () => {
    assert.equal(
      declaredTypeFor('stats.skaterStatsWithQueryContext.summary'),
      "SkaterReportRows['summary']",
    );
    assert.equal(declaredTypeFor('teams.teamRoster'), 'Roster');
  });
});
