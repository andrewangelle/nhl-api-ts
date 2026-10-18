import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildQuery,
  filter,
  isValidQuery,
  PositionTypes,
} from '#src/index.mjs';

describe('buildQuery', () => {
  it('empty filters', () => {
    const context = buildQuery([]);
    assert.equal(context.query, '');
    assert.equal(context.factQuery, 'gamesPlayed>=1');
    assert.equal(isValidQuery(context), true);
  });

  it('draft year', () => {
    const context = buildQuery([filter.draft('2020', '2')]);
    assert.equal(context.query, 'draftYear=2020 and draftRound=2');
    assert.equal(context.filters.length, 1);
  });

  it('multiple filters', () => {
    const context = buildQuery([
      filter.gameType('2'),
      filter.draft('2020', '2'),
      filter.season('20202021', '20232024'),
    ]);
    assert.equal(
      context.query,
      'gameTypeId=2 and draftYear=2020 and draftRound=2 and seasonId >= 20202021 and seasonId <= 20232024',
    );
  });

  it('position and draft', () => {
    const context = buildQuery([
      filter.gameType('2'),
      filter.draft('2020', '1'),
      filter.position(PositionTypes.CENTER),
    ]);
    assert.equal(
      context.query,
      "gameTypeId=2 and draftYear=2020 and draftRound=1 and positionCode='C'",
    );
    assert.equal(context.filters.length, 3);
  });

  it('all forwards, playoffs, season', () => {
    const context = buildQuery([
      filter.gameType('3'),
      filter.season('20222023', '20222023'),
      filter.position(PositionTypes.ALL_FORWARDS),
    ]);
    assert.equal(
      context.query,
      "gameTypeId=3 and seasonId >= 20222023 and seasonId <= 20222023 and (positionCode='L' or positionCode='R' or positionCode='C')",
    );
  });

  it('collects errors from invalid filters and skips them', () => {
    const context = buildQuery([
      filter.gameType('3'),
      filter.season('20222023', '20222023'),
      filter.position(PositionTypes.ALL_FORWARDS),
      filter.decision('Win' as never),
    ]);
    assert.equal(isValidQuery(context), false);
    assert.deepEqual(context.errors, [
      'Decision value must be one of [W, L, O]',
    ]);
    assert.equal(
      context.query,
      "gameTypeId=3 and seasonId >= 20222023 and seasonId <= 20222023 and (positionCode='L' or positionCode='R' or positionCode='C')",
    );
  });

  it('includes a valid decision filter', () => {
    const context = buildQuery([filter.decision('W')]);
    assert.equal(isValidQuery(context), true);
    assert.equal(context.query, "decision='W'");
  });
});
