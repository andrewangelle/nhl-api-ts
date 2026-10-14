import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DecisionQuery,
  DraftQuery,
  ExperienceQuery,
  FranchiseQuery,
  GameTypeQuery,
  goalieStatsSorts,
  HomeRoadQuery,
  InvalidQueryValueException,
  NationalityQuery,
  OpponentQuery,
  PositionQuery,
  PositionTypes,
  SeasonQuery,
  ShootCatchesQuery,
  SortingOptions,
  StatusQuery,
} from '#src/index.mjs';

describe('filters', () => {
  it('DecisionQuery', () => {
    assert.equal(new DecisionQuery('W').toQuery(), "decision='W'");
    assert.equal(new DecisionQuery('L').toQuery(), "decision='L'");
    assert.equal(new DecisionQuery('O').toQuery(), "decision='O'");
    assert.throws(
      () => new DecisionQuery('A').validate(),
      InvalidQueryValueException,
    );
  });

  it('DraftQuery', () => {
    assert.equal(
      new DraftQuery('2020', '2').toQuery(),
      'draftYear=2020 and draftRound=2',
    );
    assert.equal(new DraftQuery('2020').toQuery(), 'draftYear=2020');
  });

  it('ExperienceQuery', () => {
    assert.equal(new ExperienceQuery(true).toQuery(), "isRookie='1'");
    assert.equal(new ExperienceQuery(false).toQuery(), "isRookie='0'");
  });

  it('FranchiseQuery', () => {
    assert.equal(new FranchiseQuery('1').toQuery(), 'franchiseId=1');
  });

  it('GameTypeQuery', () => {
    assert.equal(new GameTypeQuery('1').toQuery(), 'gameTypeId=1');
    assert.equal(new GameTypeQuery('2').toQuery(), 'gameTypeId=2');
  });

  it('HomeRoadQuery', () => {
    assert.equal(new HomeRoadQuery('H').toQuery(), "homeRoad='H'");
    assert.equal(new HomeRoadQuery('R').toQuery(), "homeRoad='R'");
  });

  it('NationalityQuery', () => {
    assert.equal(
      new NationalityQuery('USA').toQuery(),
      "nationalityCode='USA'",
    );
  });

  it('OpponentQuery', () => {
    assert.equal(new OpponentQuery('6').toQuery(), 'opponentFranchiseId=6');
  });

  it('PositionQuery', () => {
    assert.equal(
      new PositionQuery(PositionTypes.CENTER).toQuery(),
      "positionCode='C'",
    );
    assert.equal(
      new PositionQuery(PositionTypes.LEFT_WING).toQuery(),
      "positionCode='L'",
    );
    assert.equal(
      new PositionQuery(PositionTypes.RIGHT_WING).toQuery(),
      "positionCode='R'",
    );
    assert.equal(
      new PositionQuery(PositionTypes.DEFENSE).toQuery(),
      "positionCode='D'",
    );
    assert.equal(
      new PositionQuery(PositionTypes.ALL_FORWARDS).toQuery(),
      "(positionCode='L' or positionCode='R' or positionCode='C')",
    );
  });

  it('SeasonQuery', () => {
    assert.equal(
      new SeasonQuery('20202021', '20232024').toQuery(),
      'seasonId >= 20202021 and seasonId <= 20232024',
    );
    assert.equal(
      new SeasonQuery('20202021', '20202021').toQuery(),
      'seasonId >= 20202021 and seasonId <= 20202021',
    );
    assert.equal(
      new SeasonQuery('20232024', '20202020').toQuery(),
      'seasonId >= 20232024 and seasonId <= 20202020',
    );
  });

  it('ShootCatchesQuery', () => {
    assert.equal(new ShootCatchesQuery('L').toQuery(), "shootsCatches='L'");
    assert.equal(new ShootCatchesQuery('R').toQuery(), "shootsCatches='R'");
  });

  it('StatusQuery', () => {
    assert.equal(new StatusQuery({ isActive: true }).toQuery(), 'active=1');
    assert.equal(
      new StatusQuery({ isHallOfFame: true }).toQuery(),
      'isInHallOfFame=1',
    );
    assert.equal(
      new StatusQuery({ isActive: true, isHallOfFame: true }).toQuery(),
      'isInHallOfFame=1',
    );
    assert.equal(new StatusQuery().toQuery(), '');
  });
});

describe('sorting', () => {
  it('skater report defaults fall back to summary', () => {
    assert.deepEqual(SortingOptions.getDefaultSortingForReport('timeonice'), [
      { property: 'timeOnIce', direction: 'DESC' },
      { property: 'playerId', direction: 'ASC' },
    ]);
    assert.deepEqual(
      SortingOptions.getDefaultSortingForReport('nope'),
      SortingOptions.getDefaultSortingForReport('summary'),
    );
    assert.deepEqual(
      SortingOptions.getDefaultSortingForReport('constructor'),
      SortingOptions.getDefaultSortingForReport('summary'),
    );
  });

  it('goalie report defaults', () => {
    assert.equal(goalieStatsSorts('advanced')[0].property, 'qualityStart');
    assert.deepEqual(goalieStatsSorts('unknown'), [{}]);
  });
});
