import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import {
  acceptDrift,
  diffSnapshots,
  driftReport,
  fetchPrefixes,
  filterShapes,
  isTransientFailure,
  summarize,
  summarizeSkipped,
} from '#src/check.mjs';
import { backoffMs } from '#src/fetch.mjs';
import { buildShape, type RawSample } from '#src/load.mjs';
import { writeSnapshot } from '#src/paths.mjs';
import { type ShapeNode, type Snapshot, snapshot } from '#src/shape.mjs';
import { samples } from './conform-helpers.mts';

function sample(status: number): RawSample {
  return { tags: {}, url: 'https://example.test', status, body: null };
}

describe('check', () => {
  it('treats only rate limits and server errors as transient', () => {
    assert.equal(isTransientFailure(sample(429)), true);
    assert.equal(isTransientFailure(sample(503)), true);
    assert.equal(isTransientFailure(sample(404)), false);
    assert.equal(isTransientFailure(sample(200)), false);
  });

  it('summarizes diff lines as +N -N ~N, omitting zero counts', () => {
    const lines = diffSnapshots(
      'team',
      { $: 'object', '.a': 'string', '.b': 'integer', '.c': 'string' },
      { $: 'object', '.a': 'string?', '.d': 'string', '.e': 'string' },
    );

    assert.equal(summarize(lines), '+2 -2 ~1');
    assert.equal(summarize(lines.filter((line) => line[0] === '+')), '+2');
  });

  it('groups skipped shapes by module', () => {
    const skipped = new Map([
      ['stats.clubStats', '5/5 samples failed'],
      ['stats.goalieLeaders.gaa', '2/2 samples failed'],
      ['teams.teamRoster', '8/8 samples failed'],
    ]);

    assert.deepEqual(summarizeSkipped(skipped), [
      '  stats  2 shape(s)',
      '  teams  1 shape(s)',
    ]);
  });

  it('filters shapes by --only prefix', () => {
    const shape = {} as ShapeNode;
    const shapes = new Map([
      ['edge.goalieDetail', shape],
      ['gameCenter.boxscore', shape],
      ['stats.clubStats', shape],
    ]);

    assert.deepEqual(
      [...filterShapes(shapes, ['edge', 'gameCenter']).keys()],
      ['edge.goalieDetail', 'gameCenter.boxscore'],
    );
    assert.equal(filterShapes(shapes).size, 3);
  });

  it('refetches the aliased endpoints that fold into a matching shape', () => {
    assert.deepEqual(fetchPrefixes(['edge']), ['edge']);
    assert.deepEqual(fetchPrefixes(['schedule.weeklySchedule']), [
      'schedule.weeklySchedule',
      'schedule.dailySchedule',
    ]);
    assert.deepEqual(
      fetchPrefixes(['stats.skaterStatsWithQueryContext.summary']),
      ['stats.skaterStatsWithQueryContext.summary', 'stats.skaterStatsSummary'],
    );
  });
});

describe('diffSnapshots', () => {
  it('reports a missing optional path as unseen', () => {
    const lines = diffSnapshots(
      's',
      { $: 'object', '.a': 'string?' },
      { $: 'object' },
    );
    assert.deepEqual(lines, ['? s .a  string?']);
  });

  it('folds the children of a missing optional parent into its line', () => {
    const lines = diffSnapshots(
      's',
      { $: 'object', '.a': 'object?', '.a.b': 'string' },
      { $: 'object' },
    );
    assert.deepEqual(lines, ['? s .a  object?  (+1 below)']);
    assert.equal(summarize(lines), '?2');
  });

  it('reports the items of an array that came back empty as unseen', () => {
    const after = snapshot(buildShape(samples({ x: [] }), undefined));
    const lines = diffSnapshots(
      's',
      { $: 'object', '.x': 'array', '.x[]': 'object', '.x[].y': 'string' },
      after,
    );
    assert.deepEqual(lines, ['? s .x[]  object  (+1 below)']);
  });

  it('prints nothing for a value that is a subset of the baseline', () => {
    for (const [before, after] of [
      ['string?', 'string'],
      ['float|integer', 'float'],
      ['integer|null', 'integer'],
      ['float|integer?', 'float?'],
    ]) {
      assert.deepEqual(
        diffSnapshots(
          's',
          { $: 'object', '.v': before },
          { $: 'object', '.v': after },
        ),
        [],
      );
    }
  });

  it('labels values that are not a subset', () => {
    for (const [before, after, label] of [
      ['string', 'string?', 'required -> optional'],
      ['float', 'float|integer', 'kinds added'],
      ['string?', 'integer', 'kinds changed'],
    ]) {
      assert.deepEqual(
        diffSnapshots(
          's',
          { $: 'object', '.v': before },
          { $: 'object', '.v': after },
        ),
        [`~ s .v  ${before} -> ${after} (${label})`],
      );
    }
  });

  it('reports a missing required path under a present parent as removed', () => {
    const lines = diffSnapshots(
      's',
      { $: 'object', '.x': 'object', '.x.y': 'string' },
      { $: 'object', '.x': 'object' },
    );
    assert.deepEqual(lines, ['- s .x.y  string']);
  });

  it('reports the children of a parent that lost their kind as unseen', () => {
    assert.deepEqual(
      diffSnapshots(
        's',
        { $: 'object', '.x': 'null|object', '.x.y': 'string' },
        { $: 'object', '.x': 'null' },
      ),
      ['? s .x.y  string'],
    );
    assert.deepEqual(
      diffSnapshots(
        's',
        {
          $: 'object',
          '.x': 'array|object',
          '.x.y': 'string',
          '.x[]': 'integer',
        },
        { $: 'object', '.x': 'array', '.x[]': 'integer' },
      ),
      ['? s .x.y  string'],
    );
  });
});

describe('acceptDrift', () => {
  function withShapes(
    files: Record<string, Snapshot>,
    run: (dir: string) => void,
  ) {
    const dir = mkdtempSync(`${tmpdir()}/shapes-`);
    try {
      for (const [key, snap] of Object.entries(files)) {
        writeSnapshot(dir, key, snap);
      }
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  function shapeOf(...bodies: unknown[]): ShapeNode {
    return buildShape(samples(...bodies), undefined);
  }

  it('widens values, writes new shapes whole and leaves skipped and removed shapes alone', () => {
    withShapes(
      {
        widened: { $: 'object', '.a': 'string', '.v': 'float', '.t': 'string' },
        skipped: { $: 'object' },
        removed: { $: 'object' },
      },
      (dir) => {
        const shapes = new Map([
          ['widened', shapeOf({ v: 1.5, t: 1 }, { a: 'x', v: 2, t: 2 })],
          ['skipped', shapeOf({ b: 1 })],
          ['fresh', shapeOf({ c: 1 })],
        ]);
        const result = acceptDrift(
          shapes,
          dir,
          new Map([['skipped', '1/1 samples failed']]),
        );
        assert.deepEqual([...result.writes.keys()], ['widened', 'fresh']);
        assert.deepEqual(result.writes.get('widened'), {
          $: 'object',
          '.a': 'string?',
          '.t': 'string',
          '.v': 'float|integer',
        });
        assert.deepEqual(
          result.writes.get('fresh'),
          snapshot(shapes.get('fresh') as ShapeNode),
        );
        assert.equal(result.paths, 0);
        assert.equal(result.widened, 2);
        assert.equal(result.newShapes, 1);
        assert.equal(existsSync(`${dir}/fresh.json`), false);
      },
    );
  });

  for (const [name, before, bodies, path, accepted] of [
    [
      'a new child of an existing parent',
      { $: 'object', '.p': 'object' },
      [{ p: { c: 'x' } }, { p: { c: 'y' } }],
      '.p.c',
      'string?',
    ],
    [
      'a field one sample lacks',
      { $: 'object', '.a': 'string' },
      [{ a: 'x' }, {}],
      '.a',
      'string?',
    ],
    [
      'a float field that gained integers',
      { $: 'object', '.v': 'float' },
      [{ v: 1.5 }, { v: 2 }],
      '.v',
      'float|integer',
    ],
  ] as const) {
    it(`accepts ${name}, then re-checks clean`, () => {
      withShapes({ s: before }, (dir) => {
        const shapes = new Map([['s', shapeOf(...bodies)]]);
        const first = driftReport(`${dir}/no-raw`, shapes, dir, false);
        assert.equal(first.differences, 1);

        const result = acceptDrift(shapes, dir, first.skipped);
        for (const [key, snap] of result.writes) {
          writeSnapshot(dir, key, snap);
        }
        const written = JSON.parse(readFileSync(`${dir}/s.json`, 'utf8'));
        assert.equal(written[path], accepted);

        const second = driftReport(`${dir}/no-raw`, shapes, dir, false);
        assert.deepEqual(second.lines, []);
        assert.equal(second.differences, 0);
        assert.equal(acceptDrift(shapes, dir, second.skipped).writes.size, 0);
      });
    });
  }
});

describe('backoffMs', () => {
  it('uses Retry-After seconds when sent', () => {
    assert.equal(backoffMs('7', 1), 7_000);
  });

  it('backs off exponentially without Retry-After', () => {
    assert.equal(backoffMs(null, 1), 5_000);
    assert.equal(backoffMs(null, 2), 10_000);
    assert.equal(backoffMs('', 3), 20_000);
  });

  it('caps the wait at a minute', () => {
    assert.equal(backoffMs('3600', 1), 60_000);
  });

  it('reads an HTTP-date Retry-After', () => {
    const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
    const ms = backoffMs(inTenSeconds, 1);
    assert.ok(ms > 8_000 && ms <= 10_000, `got ${ms}`);
  });
});
