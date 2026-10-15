// These mock at the API class level (Teams, Schedule,
// Stats) because Helpers orchestrates several API modules.
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  type Helpers,
  Schedule,
  Stats,
  type Team,
  Teams,
} from '#src/index.mjs';
import { newClient } from './fetch-mock.mts';

const teamsData = [
  { abbr: 'TOR', franchise_id: 5 },
  { abbr: 'MTL', franchise_id: 1 },
] as Team[];

const scheduleData: Record<string, object> = {
  TOR: {
    games: [
      { id: 2024010001, gameType: 1 },
      { id: 2024020001, gameType: 2 },
      { id: 2024030001, gameType: 3 },
    ],
  },
  MTL: {
    games: [
      { id: 2024020001, gameType: 2 },
      { id: 2024020002, gameType: 2 },
    ],
  },
};

const rosterData = () => ({
  TOR: {
    forwards: [
      {
        id: 1,
        firstName: { default: 'Auston' },
        lastName: { default: 'Matthews' },
      },
    ],
    defensemen: [],
    goalies: [],
  },
  MTL: {
    forwards: [],
    defensemen: [
      {
        id: 2,
        firstName: { default: 'Mike' },
        lastName: { default: 'Matheson' },
      },
    ],
    goalies: [],
  },
});

let helpers: Helpers;
let sleepMock: ReturnType<typeof mock.method>;

beforeEach(() => {
  helpers = newClient().helpers;
  sleepMock = mock.method(helpers, 'sleep', async () => {});
  mock.method(console, 'error', () => {});
});
afterEach(() => mock.restoreAll());

const mockTeams = (data: Team[]) =>
  mock.method(Teams.prototype, 'teams', async () => data);
const mockSeasonSchedule = () =>
  mock.method(
    Schedule.prototype,
    'teamSeasonSchedule',
    async ({ teamAbbr }: { teamAbbr: string }) => scheduleData[teamAbbr],
  );

describe('Helpers.gameIdsBySeason', () => {
  it('collects game ids across teams', async () => {
    mockTeams(teamsData);
    mockSeasonSchedule();
    const result = await helpers.gameIdsBySeason({
      season: '20242025',
      apiSleepRate: 0.1,
    });
    assert.deepEqual(
      result,
      [2024010001, 2024020001, 2024030001, 2024020001, 2024020002],
    );
    assert.equal(sleepMock.mock.callCount(), 2);
    assert.deepEqual(sleepMock.mock.calls.at(-1)?.arguments, [0.1]);
  });

  it('filters by game type', async () => {
    mockTeams(teamsData);
    mockSeasonSchedule();
    const result = await helpers.gameIdsBySeason({
      season: '20242025',
      gameTypes: [2],
    });
    assert.deepEqual(result, [2024020001, 2024020001, 2024020002]);
    assert.deepEqual(sleepMock.mock.calls[0].arguments, [1]);
  });

  it('skips teams without an abbreviation', async () => {
    mockTeams([
      { abbr: 'TOR', franchise_id: 5 },
      { abbr: '', franchise_id: 99 },
    ] as Team[]);
    const schedule = mock.method(
      Schedule.prototype,
      'teamSeasonSchedule',
      async () => ({
        games: [{ id: 2024020001, gameType: 2 }],
      }),
    );
    const result = await helpers.gameIdsBySeason({ season: '20242025' });
    assert.deepEqual(result, [2024020001]);
    assert.equal(schedule.mock.callCount(), 1);
    assert.deepEqual(schedule.mock.calls[0].arguments, [
      { teamAbbr: 'TOR', season: '20242025' },
    ]);
  });

  it('handles no teams', async () => {
    mockTeams([]);
    const schedule = mockSeasonSchedule();
    assert.deepEqual(await helpers.gameIdsBySeason({ season: '20242025' }), []);
    assert.equal(schedule.mock.callCount(), 0);
  });
});

describe('Helpers.allPlayers', () => {
  it('flattens rosters and tags teams', async () => {
    mockTeams(teamsData);
    const rosters = rosterData();
    mock.method(
      Teams.prototype,
      'teamRoster',
      async ({ teamAbbr }: { teamAbbr: 'TOR' | 'MTL' }) => rosters[teamAbbr],
    );
    const result = await helpers.allPlayers({ season: '20242025' });
    assert.deepEqual(result, [
      { id: 1, firstName: 'Auston', lastName: 'Matthews', team: 'TOR' },
      { id: 2, firstName: 'Mike', lastName: 'Matheson', team: 'MTL' },
    ]);
    assert.deepEqual(sleepMock.mock.calls[0].arguments, [0.5]);
  });
});

describe('Helpers.allPlayersSummaryStatistics', () => {
  it('merges stats over player info and keeps unmatched entries', async () => {
    mock.method(helpers, 'allPlayers', async () => [
      {
        id: 1,
        firstName: 'Auston',
        lastName: 'Matthews',
        team: 'TOR',
        position: 'C',
      },
      {
        id: 2,
        firstName: 'Mike',
        lastName: 'Matheson',
        team: 'MTL',
        position: 'D',
      },
    ]);
    mockTeams(teamsData);
    const stats = mock.method(
      Stats.prototype,
      'skaterStatsWithQueryContext',
      async () => ({
        data: [
          { playerId: 1, goals: 50, position: 'F' },
          { playerId: 999, goals: 10 },
        ],
      }),
    );

    const result = await helpers.allPlayersSummaryStatistics({
      season: '20242025',
    });

    const matched = result.filter((entry) => entry.playerId === 1);
    assert.ok(matched.length >= 1);
    // Stat fields overwrite player fields on collision
    assert.equal(matched[0].position, 'F');
    assert.equal(matched[0].goals, 50);
    assert.equal(matched[0].firstName, 'Auston');

    const unmatched = result.filter((entry) => entry.playerId === 999);
    assert.ok(unmatched.length >= 1);
    assert.equal(unmatched[0].goals, 10);

    const firstCall = stats.mock.calls[0].arguments[0] as {
      reportType: string;
      aggregate: boolean;
      queryContext: { queryStr: string };
    };
    assert.equal(firstCall.reportType, 'summary');
    assert.equal(firstCall.aggregate, true);
    assert.equal(
      firstCall.queryContext.queryStr,
      'franchiseId=5 and seasonId >= 20242025 and seasonId <= 20242025',
    );
  });

  it('handles no teams', async () => {
    mock.method(helpers, 'allPlayers', async () => []);
    mockTeams([]);
    const stats = mock.method(
      Stats.prototype,
      'skaterStatsWithQueryContext',
      async () => ({}),
    );
    assert.deepEqual(
      await helpers.allPlayersSummaryStatistics({ season: '20242025' }),
      [],
    );
    assert.equal(stats.mock.callCount(), 0);
  });
});
