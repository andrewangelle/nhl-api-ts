// gameIdsBySeason, allPlayers and allPlayersSummaryStatistics orchestrate
// several endpoints (teams, schedule, roster, stats), so they're exercised
// through a hand-built Context: a fake `get` that routes on `resource`, and
// a recording `sleep`.
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { Endpoint, QueryParams } from '#src/http-client.mjs';
import { helpers } from '#src/index.mjs';

const { allPlayers, allPlayersSummaryStatistics, gameIdsBySeason } = helpers;

const standingsEntry = (abbr: string, name: string) => ({
  conferenceAbbrev: 'E',
  conferenceName: 'Eastern',
  divisionAbbrev: 'A',
  divisionName: 'Atlantic',
  teamName: { default: name },
  teamCommonName: { default: name },
  teamAbbrev: abbr ? { default: abbr } : undefined,
  teamLogo: `logo-${abbr}`,
});

const defaultStandings = [
  standingsEntry('TOR', 'Toronto Maple Leafs'),
  standingsEntry('MTL', 'Montreal Canadiens'),
];

const defaultFranchises = [
  { id: 5, fullName: 'Toronto Maple Leafs' },
  { id: 1, fullName: 'Montreal Canadiens' },
];

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

const rosterData = (): Record<string, object> => ({
  TOR: {
    forwards: [
      {
        id: 1,
        firstName: { default: 'Auston' },
        lastName: { default: 'Matthews' },
        position: 'C',
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

interface GetCall {
  resource: string;
  params?: QueryParams;
}

interface GetOverrides {
  standings?: object[];
  franchises?: object[];
  schedule?: Record<string, object>;
  roster?: Record<string, object>;
  statsSummary?: unknown;
}

/** A fake `Context.get` that records calls and routes on `resource`. */
function makeGet(overrides: GetOverrides = {}) {
  const calls: GetCall[] = [];
  const get = async (
    _endpoint: Endpoint,
    resource: string,
    params?: QueryParams,
  ): Promise<Response> => {
    calls.push({ resource, params });
    let body: unknown = {};
    if (resource === 'standings/now') {
      body = { standings: overrides.standings ?? defaultStandings };
    } else if (resource === 'en/franchise') {
      body = { data: overrides.franchises ?? defaultFranchises };
    } else if (resource.startsWith('club-schedule-season/')) {
      const [, teamAbbr] = resource.split('/');
      body = overrides.schedule?.[teamAbbr] ?? { games: [] };
    } else if (resource.startsWith('roster/')) {
      const [, teamAbbr] = resource.split('/');
      body = overrides.roster?.[teamAbbr] ?? {
        forwards: [],
        defensemen: [],
        goalies: [],
      };
    } else if (resource === 'en/skater/summary') {
      body = overrides.statsSummary ?? {};
    }
    return new Response(JSON.stringify(body));
  };
  return { get, calls };
}

/** A recording `Context.sleep`. */
function sleepSpy() {
  const calls: number[] = [];
  const sleep = async (seconds: number): Promise<void> => {
    calls.push(seconds);
  };
  return { sleep, calls };
}

beforeEach(() => {
  mock.method(console, 'error', () => {});
});

describe('gameIdsBySeason', () => {
  it('collects game ids across teams', async () => {
    const { get } = makeGet({ schedule: scheduleData });
    const { sleep, calls: sleepCalls } = sleepSpy();
    const result = await gameIdsBySeason(
      { get, sleep },
      { season: '20242025', apiSleepRate: 0.1 },
    );
    assert.deepEqual(
      result,
      [2024010001, 2024020001, 2024030001, 2024020001, 2024020002],
    );
    assert.equal(sleepCalls.length, 2);
    assert.equal(sleepCalls.at(-1), 0.1);
  });

  it('filters by game type', async () => {
    const { get } = makeGet({ schedule: scheduleData });
    const { sleep, calls: sleepCalls } = sleepSpy();
    const result = await gameIdsBySeason(
      { get, sleep },
      { season: '20242025', gameTypes: [2] },
    );
    assert.deepEqual(result, [2024020001, 2024020001, 2024020002]);
    assert.equal(sleepCalls[0], 1);
  });

  it('skips teams without an abbreviation', async () => {
    const { get, calls } = makeGet({
      standings: [
        standingsEntry('TOR', 'Toronto Maple Leafs'),
        standingsEntry('', 'Unknown Team'),
      ],
      schedule: { TOR: { games: [{ id: 2024020001, gameType: 2 }] } },
    });
    const { sleep } = sleepSpy();
    const result = await gameIdsBySeason(
      { get, sleep },
      { season: '20242025' },
    );
    assert.deepEqual(result, [2024020001]);
    const scheduleCalls = calls.filter((call) =>
      call.resource.startsWith('club-schedule-season/'),
    );
    assert.equal(scheduleCalls.length, 1);
    assert.equal(
      scheduleCalls[0].resource,
      'club-schedule-season/TOR/20242025',
    );
  });

  it('handles no teams', async () => {
    const { get, calls } = makeGet({ standings: [] });
    const { sleep } = sleepSpy();
    const result = await gameIdsBySeason(
      { get, sleep },
      { season: '20242025' },
    );
    assert.deepEqual(result, []);
    const scheduleCalls = calls.filter((call) =>
      call.resource.startsWith('club-schedule-season/'),
    );
    assert.equal(scheduleCalls.length, 0);
  });
});

describe('allPlayers', () => {
  it('flattens rosters and tags teams', async () => {
    const { get } = makeGet({ roster: rosterData() });
    const { sleep, calls: sleepCalls } = sleepSpy();
    const result = await allPlayers({ get, sleep }, { season: '20242025' });
    assert.deepEqual(result, [
      {
        id: 1,
        firstName: 'Auston',
        lastName: 'Matthews',
        position: 'C',
        team: 'TOR',
      },
      { id: 2, firstName: 'Mike', lastName: 'Matheson', team: 'MTL' },
    ]);
    assert.equal(sleepCalls[0], 0.5);
  });
});

describe('allPlayersSummaryStatistics', () => {
  it('merges stats over player info and keeps unmatched entries', async () => {
    const { get, calls } = makeGet({
      roster: rosterData(),
      statsSummary: {
        data: [
          { playerId: 1, goals: 50, position: 'F' },
          { playerId: 999, goals: 10 },
        ],
      },
    });
    const { sleep } = sleepSpy();

    const result = await allPlayersSummaryStatistics(
      { get, sleep },
      { season: '20242025' },
    );

    const matched = result.filter((entry) => entry.playerId === 1);
    assert.ok(matched.length >= 1);
    // Stat fields overwrite player fields on collision
    assert.equal(matched[0].position, 'F');
    assert.equal(matched[0].goals, 50);
    assert.equal(matched[0].firstName, 'Auston');

    const unmatched = result.filter((entry) => entry.playerId === 999);
    assert.ok(unmatched.length >= 1);
    assert.equal(unmatched[0].goals, 10);

    const statsCalls = calls.filter(
      (call) => call.resource === 'en/skater/summary',
    );
    assert.equal(statsCalls[0].params?.isAggregate, true);
    assert.equal(
      statsCalls[0].params?.cayenneExp,
      'franchiseId=5 and seasonId >= 20242025 and seasonId <= 20242025',
    );
  });

  it('handles no teams', async () => {
    const { get, calls } = makeGet({ standings: [] });
    const { sleep } = sleepSpy();
    assert.deepEqual(
      await allPlayersSummaryStatistics({ get, sleep }, { season: '20242025' }),
      [],
    );
    const statsCalls = calls.filter(
      (call) => call.resource === 'en/skater/summary',
    );
    assert.equal(statsCalls.length, 0);
  });
});
