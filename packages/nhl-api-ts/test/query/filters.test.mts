import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultSortForSkaterStatsSummary,
  defaultSortForTeamSummary,
  type SortExpr,
} from '#src/api/query/sorting/sorting-options.mjs';
import {
  type Decision,
  defaultSortForReport,
  filter,
  goalieStatsSorts,
  PositionTypes,
  toQuery,
  validateFilter,
} from '#src/index.mjs';

describe('filters', () => {
  it('decision', () => {
    assert.equal(toQuery(filter.decision('W')), "decision='W'");
    assert.equal(toQuery(filter.decision('L')), "decision='L'");
    assert.equal(toQuery(filter.decision('O')), "decision='O'");
    assert.equal(
      validateFilter(filter.decision('A' as Decision)),
      'Decision value must be one of [W, L, O]',
    );
  });

  it('draft', () => {
    assert.equal(
      toQuery(filter.draft('2020', '2')),
      'draftYear=2020 and draftRound=2',
    );
    assert.equal(toQuery(filter.draft('2020')), 'draftYear=2020');
  });

  it('experience', () => {
    assert.equal(toQuery(filter.experience(true)), "isRookie='1'");
    assert.equal(toQuery(filter.experience(false)), "isRookie='0'");
  });

  it('franchise', () => {
    assert.equal(toQuery(filter.franchise('1')), 'franchiseId=1');
  });

  it('gameType', () => {
    assert.equal(toQuery(filter.gameType('1')), 'gameTypeId=1');
    assert.equal(toQuery(filter.gameType('2')), 'gameTypeId=2');
  });

  it('homeRoad', () => {
    assert.equal(toQuery(filter.homeRoad('H')), "homeRoad='H'");
    assert.equal(toQuery(filter.homeRoad('R')), "homeRoad='R'");
  });

  it('nationality', () => {
    assert.equal(toQuery(filter.nationality('USA')), "nationalityCode='USA'");
  });

  it('opponent', () => {
    assert.equal(toQuery(filter.opponent('6')), 'opponentFranchiseId=6');
  });

  it('position', () => {
    assert.equal(
      toQuery(filter.position(PositionTypes.CENTER)),
      "positionCode='C'",
    );
    assert.equal(
      toQuery(filter.position(PositionTypes.LEFT_WING)),
      "positionCode='L'",
    );
    assert.equal(
      toQuery(filter.position(PositionTypes.RIGHT_WING)),
      "positionCode='R'",
    );
    assert.equal(
      toQuery(filter.position(PositionTypes.DEFENSE)),
      "positionCode='D'",
    );
    assert.equal(
      toQuery(filter.position(PositionTypes.ALL_FORWARDS)),
      "(positionCode='L' or positionCode='R' or positionCode='C')",
    );
  });

  it('season', () => {
    assert.equal(
      toQuery(filter.season('20202021', '20232024')),
      'seasonId >= 20202021 and seasonId <= 20232024',
    );
    assert.equal(
      toQuery(filter.season('20202021', '20202021')),
      'seasonId >= 20202021 and seasonId <= 20202021',
    );
    assert.equal(
      toQuery(filter.season('20232024', '20202020')),
      'seasonId >= 20232024 and seasonId <= 20202020',
    );
  });

  it('shootCatch', () => {
    assert.equal(toQuery(filter.shootCatch('L')), "shootsCatches='L'");
    assert.equal(toQuery(filter.shootCatch('R')), "shootsCatches='R'");
  });

  it('status', () => {
    assert.equal(toQuery(filter.status({ isActive: true })), 'active=1');
    assert.equal(
      toQuery(filter.status({ isHallOfFame: true })),
      'isInHallOfFame=1',
    );
    assert.equal(
      toQuery(filter.status({ isActive: true, isHallOfFame: true })),
      'isInHallOfFame=1',
    );
    assert.equal(toQuery(filter.status()), '');
  });
});

describe('sorting', () => {
  it('skater report defaults fall back to summary', () => {
    assert.deepEqual(defaultSortForReport('timeonice'), [
      { property: 'timeOnIce', direction: 'DESC' },
      { property: 'playerId', direction: 'ASC' },
    ]);
    assert.deepEqual(
      defaultSortForReport('nope'),
      defaultSortForReport('summary'),
    );
    assert.deepEqual(
      defaultSortForReport('constructor'),
      defaultSortForReport('summary'),
    );
  });

  it('team summary defaults', () => {
    assert.deepEqual(defaultSortForTeamSummary(undefined, false), [
      { property: 'points', direction: 'DESC' },
      { property: 'wins', direction: 'DESC' },
      { property: 'teamId', direction: 'ASC' },
    ]);
    assert.deepEqual(defaultSortForTeamSummary([], false), [
      { property: 'points', direction: 'DESC' },
      { property: 'wins', direction: 'DESC' },
      { property: 'teamId', direction: 'ASC' },
    ]);
    // aggregated rows have no teamId, so the tiebreaker is franchiseId
    assert.deepEqual(defaultSortForTeamSummary(undefined, true), [
      { property: 'points', direction: 'DESC' },
      { property: 'wins', direction: 'DESC' },
      { property: 'franchiseId', direction: 'ASC' },
    ]);
  });

  it('team summary keeps a provided sort', () => {
    const custom: SortExpr[] = [{ property: 'goalsFor', direction: 'DESC' }];
    assert.equal(defaultSortForTeamSummary(custom, false), custom);
    assert.equal(defaultSortForTeamSummary(custom, true), custom);
  });

  it('skater stats summary defaults', () => {
    const expected = [
      { property: 'points', direction: 'DESC' },
      { property: 'gamesPlayed', direction: 'ASC' },
      { property: 'playerId', direction: 'ASC' },
    ];
    assert.deepEqual(defaultSortForSkaterStatsSummary(undefined), expected);
    assert.deepEqual(defaultSortForSkaterStatsSummary([]), expected);
    assert.deepEqual(
      defaultSortForSkaterStatsSummary(undefined),
      defaultSortForReport('summary'),
    );
  });

  it('skater stats summary keeps a provided sort', () => {
    const custom: SortExpr[] = [{ property: 'goals', direction: 'DESC' }];
    assert.equal(defaultSortForSkaterStatsSummary(custom), custom);
  });

  it('goalie report defaults', () => {
    assert.equal(goalieStatsSorts('advanced')[0].property, 'qualityStart');
    assert.deepEqual(goalieStatsSorts('unknown'), [
      { property: 'wins', direction: 'DESC' },
      { property: 'gamesPlayed', direction: 'ASC' },
      { property: 'playerId', direction: 'ASC' },
    ]);
  });
});
