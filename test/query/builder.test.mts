import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DecisionQuery,
  DraftQuery,
  GameTypeQuery,
  PositionQuery,
  PositionTypes,
  QueryBuilder,
  SeasonQuery,
} from '#src/index.mjs';

describe('QueryBuilder', () => {
  it('empty filters', () => {
    const context = new QueryBuilder().build([]);
    assert.equal(context.queryStr, '');
    assert.equal(context.factQuery, 'gamesPlayed>=1');
    assert.equal(context.isValid(), true);
  });

  it('skips non-filter values', () => {
    assert.equal(new QueryBuilder().build(['invalid']).queryStr, '');
  });

  it('draft year', () => {
    const context = new QueryBuilder().build([new DraftQuery('2020', '2')]);
    assert.equal(context.queryStr, 'draftYear=2020 and draftRound=2');
    assert.equal(context.filters.length, 1);
  });

  it('multiple filters', () => {
    const context = new QueryBuilder().build([
      new GameTypeQuery('2'),
      new DraftQuery('2020', '2'),
      new SeasonQuery('20202021', '20232024'),
    ]);
    assert.equal(
      context.queryStr,
      'gameTypeId=2 and draftYear=2020 and draftRound=2 and seasonId >= 20202021 and seasonId <= 20232024',
    );
  });

  it('position and draft', () => {
    const context = new QueryBuilder().build([
      new GameTypeQuery('2'),
      new DraftQuery('2020', '1'),
      new PositionQuery(PositionTypes.CENTER),
    ]);
    assert.equal(
      context.queryStr,
      "gameTypeId=2 and draftYear=2020 and draftRound=1 and positionCode='C'",
    );
    assert.equal(context.filters.length, 3);
  });

  it('all forwards, playoffs, season', () => {
    const context = new QueryBuilder().build([
      new GameTypeQuery('3'),
      new SeasonQuery('20222023', '20222023'),
      new PositionQuery(PositionTypes.ALL_FORWARDS),
    ]);
    assert.equal(
      context.queryStr,
      "gameTypeId=3 and seasonId >= 20222023 and seasonId <= 20222023 and (positionCode='L' or positionCode='R' or positionCode='C')",
    );
  });

  it('collects errors from invalid filters and skips them', () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      const context = new QueryBuilder({ debug: true }).build([
        new GameTypeQuery('3'),
        new SeasonQuery('20222023', '20222023'),
        new PositionQuery(PositionTypes.ALL_FORWARDS),
        new DecisionQuery('Win'),
      ]);
      assert.equal(context.isValid(), false);
      assert.deepEqual(context.errors, [
        'Decision value must be one of [W, L, O]',
      ]);
      assert.equal(
        context.queryStr,
        "gameTypeId=3 and seasonId >= 20222023 and seasonId <= 20222023 and (positionCode='L' or positionCode='R' or positionCode='C')",
      );
      assert.equal(errors.length, 1);
    } finally {
      console.error = original;
    }
  });

  it('includes a valid decision filter', () => {
    const context = new QueryBuilder().build([new DecisionQuery('W')]);
    assert.equal(context.isValid(), true);
    assert.equal(context.queryStr, "decision='W'");
  });
});
