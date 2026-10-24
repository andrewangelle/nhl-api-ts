import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { ServerErrorException } from '#src/index.mjs';
import {
  calledUrls,
  mockFetch,
  newClient,
  pathOf,
  queryOf,
} from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('Misc', () => {
  const cases = [
    ['glossary', 'stats/rest/en/glossary?sort=fullName'],
    ['countries', 'stats/rest/en/country'],
    ['seasonSpecificRulesAndInfo', 'stats/rest/en/season'],
    ['draftYearAndRounds', 'stats/rest/en/draft'],
  ] as const;

  for (const [method, resource] of cases) {
    it(`${method} unwraps data`, async () => {
      const fetchSpy = mockFetch(() => ({ body: { data: [{ id: 1 }] } }));
      assert.deepEqual(await newClient().misc[method](), [{ id: 1 }]);
      assert.deepEqual(calledUrls(fetchSpy), [
        `https://api.nhle.com/${resource}`,
      ]);
    });
  }

  it('config returns the full payload', async () => {
    const fetchSpy = mockFetch(() => ({ body: { playerReportData: {} } }));
    assert.deepEqual(await newClient().misc.config(), { playerReportData: {} });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/config',
    ]);
  });

  const webCases: [
    string,
    (client: ReturnType<typeof newClient>) => Promise<unknown>,
    string,
  ][] = [
    [
      'tvSchedule defaults to now',
      (client) => client.misc.tvSchedule(),
      'network/tv-schedule/now',
    ],
    [
      'tvSchedule with date',
      (client) => client.misc.tvSchedule({ date: '2023-10-15' }),
      'network/tv-schedule/2023-10-15',
    ],
    [
      'partnerGameOdds',
      (client) => client.misc.partnerGameOdds({ countryCode: 'US' }),
      'partner-game/US/now',
    ],
    ['seasonIds', (client) => client.misc.seasonIds(), 'season'],
    ['location', (client) => client.misc.location(), 'location'],
    [
      'postalLookup',
      (client) => client.misc.postalLookup({ postalCode: '90210' }),
      'postal-lookup/90210',
    ],
    [
      'postalLookup encodes the code',
      (client) => client.misc.postalLookup({ postalCode: 'M5V 3L9' }),
      'postal-lookup/M5V%203L9',
    ],
    ['meta without lists', (client) => client.misc.meta(), 'meta'],
    [
      'meta omits empty lists',
      (client) => client.misc.meta({ players: [], teams: ['TOR'] }),
      'meta?teams=TOR',
    ],
  ];

  for (const [name, call, resource] of webCases) {
    it(name, async () => {
      const fetchSpy = mockFetch();
      await call(newClient());
      assert.deepEqual(calledUrls(fetchSpy), [
        `https://api-web.nhle.com/v1/${resource}`,
      ]);
    });
  }

  it('meta joins players and teams', async () => {
    const fetchSpy = mockFetch();
    await newClient().misc.meta({
      players: [8478402, '8476945'],
      teams: ['TOR', 'BUF'],
    });
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), 'https://api-web.nhle.com/v1/meta');
    assert.deepEqual(queryOf(url), {
      players: '8478402,8476945',
      teams: 'TOR,BUF',
    });
  });

  it('seasonIds returns the bare array', async () => {
    mockFetch(() => ({ body: [19171918, 20262027] }));
    assert.deepEqual(await newClient().misc.seasonIds(), [19171918, 20262027]);
  });

  it('componentSeasons', async () => {
    const row = { id: 'stats', seasonId: 20262027 };
    const fetchSpy = mockFetch(() => ({ body: { data: [row], total: 1 } }));
    assert.deepEqual(await newClient().misc.componentSeasons(), [row]);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/componentSeason',
    ]);
  });

  async function gamesExp(
    params: Parameters<ReturnType<typeof newClient>['misc']['games']>[0],
  ): Promise<string> {
    const fetchSpy = mockFetch();
    await newClient().misc.games(params);
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), 'https://api.nhle.com/stats/rest/en/game');
    return queryOf(url).cayenneExp;
  }

  it('games filters by season', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [], total: 0 } }));
    assert.deepEqual(await newClient().misc.games({ season: 20232024 }), []);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/game?cayenneExp=season%3D20232024',
    ]);
  });

  it('games teamId matches home or away', async () => {
    assert.equal(
      await gamesExp({ teamId: 10 }),
      'homeTeamId=10 or visitingTeamId=10',
    );
  });

  it('games joins every filter with and', async () => {
    assert.equal(
      await gamesExp({
        season: '20232024',
        gameType: 3,
        teamId: 10,
        startDate: '2024-4-1',
        endDate: '2024-05-31',
        cayenneExp: 'homeScore>=5',
      }),
      "(season=20232024) and (gameType=3) and (homeTeamId=10 or visitingTeamId=10) and (gameDate>='2024-04-01') and (gameDate<='2024-05-31') and (homeScore>=5)",
    );
  });

  it('games rejects a call without a filter, without a request', async () => {
    const fetchSpy = mockFetch();
    for (const params of [{}, { cayenneExp: ' ' }]) {
      await assert.rejects(newClient().misc.games(params), RangeError);
    }
    assert.equal(fetchSpy.mock.callCount(), 0);
  });

  it('games rejects a bad date', async () => {
    mockFetch();
    await assert.rejects(
      newClient().misc.games({ startDate: '2024/01/01' }),
      RangeError,
    );
  });

  it('ping resolves true', async () => {
    const fetchSpy = mockFetch();
    assert.equal(await newClient().misc.ping(), true);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/ping',
    ]);
  });

  it('ping throws when the stats API is down', async () => {
    mockFetch(() => ({ status: 503 }));
    await assert.rejects(newClient().misc.ping(), ServerErrorException);
  });
});
