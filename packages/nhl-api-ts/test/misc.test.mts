import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
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
});
