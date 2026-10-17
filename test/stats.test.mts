import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import type {
  GoalieReportRows,
  GoalieReportType,
  SkaterReportRows,
  SkaterReportType,
} from '#src/index.mjs';
import { buildQuery, filter } from '#src/index.mjs';
import {
  calledUrls,
  mockFetch,
  newClient,
  pathOf,
  queryOf,
} from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const STATS = 'https://api.nhle.com/stats/rest/';

describe('Stats', () => {
  it('gametypesPerSeasonDirectoryByTeam', async () => {
    const fetchSpy = mockFetch(() => ({ body: [] }));
    await newClient().stats.gametypesPerSeasonDirectoryByTeam({
      teamAbbr: 'BUF',
    });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/club-stats-season/BUF',
    ]);
  });

  it('playerCareerStats', async () => {
    const fetchSpy = mockFetch();
    await newClient().stats.playerCareerStats({ playerId: 8481528 });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/player/8481528/landing',
    ]);
  });

  for (const gameType of [2, 3]) {
    it(`playerGameLog (gameType ${gameType})`, async () => {
      const fetchSpy = mockFetch(() => ({
        body: { gameLog: [{ gameId: 1 }] },
      }));
      const log = await newClient().stats.playerGameLog({
        playerId: '8481528',
        seasonId: '20232024',
        gameType,
      });
      assert.deepEqual(log, [{ gameId: 1 }]);
      assert.deepEqual(calledUrls(fetchSpy), [
        `https://api-web.nhle.com/v1/player/8481528/game-log/20232024/${gameType}`,
      ]);
    });
  }

  it('teamSummary single year', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [{ teamId: 1 }] } }));
    const data = await newClient().stats.teamSummary({
      startSeason: '20232024',
      endSeason: '20232024',
    });
    assert.deepEqual(data, [{ teamId: 1 }]);
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), `${STATS}en/team/summary`);
    assert.deepEqual(queryOf(url), {
      isAggregate: 'false',
      isGame: 'false',
      limit: '50',
      start: '0',
      factCayenneExp: 'gamesPlayed>1',
      sort: '[{"property":"points","direction":"DESC"},{"property":"wins","direction":"DESC"},{"property":"teamId","direction":"ASC"}]',
      cayenneExp: 'gameTypeId=2 and seasonId<=20232024 and seasonId>=20232024',
    });
  });

  it('teamSummary sorts aggregated rows by franchiseId, which they have instead of teamId', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [] } }));
    await newClient().stats.teamSummary({
      startSeason: '20222023',
      endSeason: '20232024',
      isAggregate: true,
    });
    assert.equal(
      queryOf(calledUrls(fetchSpy)[0]).sort,
      '[{"property":"points","direction":"DESC"},{"property":"wins","direction":"DESC"},{"property":"franchiseId","direction":"ASC"}]',
    );
  });

  it('teamSummary year range playoffs', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [] } }));
    await newClient().stats.teamSummary({
      startSeason: '20182019',
      endSeason: '20222023',
      gameTypeId: 3,
    });
    assert.equal(
      queryOf(calledUrls(fetchSpy)[0]).cayenneExp,
      'gameTypeId=3 and seasonId<=20222023 and seasonId>=20182019',
    );
  });

  it('skaterStatsSummary', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [] } }));
    await newClient().stats.skaterStatsSummary({
      startSeason: '20232024',
      endSeason: '20232024',
    });
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), `${STATS}en/skater/summary`);
    assert.deepEqual(queryOf(url), {
      isAggregate: 'false',
      isGame: 'false',
      limit: '25',
      start: '0',
      factCayenneExp: 'gamesPlayed>=1',
      sort: '[{"property":"points","direction":"DESC"},{"property":"gamesPlayed","direction":"ASC"},{"property":"playerId","direction":"ASC"}]',
      cayenneExp: 'gameTypeId=2 and seasonId<=20232024 and seasonId>=20232024',
    });
  });

  it('skaterStatsSummary with franchise', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [] } }));
    await newClient().stats.skaterStatsSummary({
      startSeason: '20232024',
      endSeason: '20232024',
      franchiseId: 19,
    });
    assert.equal(
      queryOf(calledUrls(fetchSpy)[0]).cayenneExp,
      'franchiseId=19 and gameTypeId=2 and seasonId<=20232024 and seasonId>=20232024',
    );
  });

  it('skaterStatsWithQueryContext uses the report default sort', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [], total: 0 } }));
    const context = buildQuery([
      filter.franchise(5),
      filter.season('20232024', '20232024'),
    ]);
    const result = await newClient().stats.skaterStatsWithQueryContext({
      queryContext: context,
      reportType: 'realtime',
      aggregate: true,
    });
    assert.deepEqual(result, { data: [], total: 0 });
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), `${STATS}en/skater/realtime`);
    assert.deepEqual(queryOf(url), {
      isAggregate: 'true',
      isGame: 'false',
      start: '0',
      limit: '25',
      factCayenneExp: 'gamesPlayed>=1',
      sort: '[{"property":"hits","direction":"DESC"},{"property":"playerId","direction":"ASC"}]',
      cayenneExp:
        'franchiseId=5 and seasonId >= 20232024 and seasonId <= 20232024',
    });
  });

  it('goalieStatsSummary defaults', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [{ playerId: 1 }] } }));
    const data = await newClient().stats.goalieStatsSummary({
      startSeason: '20232024',
    });
    assert.deepEqual(data, [{ playerId: 1 }]);
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), `${STATS}en/goalie/summary`);
    assert.deepEqual(queryOf(url), {
      isAggregate: 'false',
      isGame: 'false',
      start: '0',
      limit: '25',
      factCayenneExp: '',
      sort: '[{"property":"wins","direction":"DESC"},{"property":"gamesPlayed","direction":"ASC"},{"property":"playerId","direction":"ASC"}]',
      cayenneExp: 'gameTypeId=2 and seasonId<=20232024 and seasonId>=20232024',
    });
  });

  it('goalieStatsSummary prefixes franchise even with a custom cayenneExp', async () => {
    const fetchSpy = mockFetch(() => ({ body: {} }));
    const data = await newClient().stats.goalieStatsSummary({
      startSeason: '20222023',
      endSeason: '20232024',
      // @ts-expect-error unknown report names are rejected at compile time
      statsType: 'unknownReport',
      franchiseId: 6,
      defaultCayenneExp: 'gameTypeId=3',
    });
    assert.deepEqual(data, []);
    const query = queryOf(calledUrls(fetchSpy)[0]);
    assert.equal(query.cayenneExp, 'franchiseId=6 and gameTypeId=3');
    assert.equal(
      query.sort,
      '[{"property":"wins","direction":"DESC"},{"property":"gamesPlayed","direction":"ASC"},{"property":"playerId","direction":"ASC"}]',
    );
  });
});

// Compile-time checks (`tsc -p test`). They live here, not in test/types/,
// because that program augments the registries on purpose.

type Equals<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false;
const assertType = <Value extends true>(): Value | undefined => undefined;

// The row registries and the default-sort tables list the same reports.
assertType<Equals<keyof SkaterReportRows, SkaterReportType>>();
assertType<Equals<keyof GoalieReportRows, GoalieReportType>>();

describe('skaterStatsWithQueryContext fact filter', () => {
  it('drops the default fact filter for reports without gamesPlayed', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [], total: 0 } }));
    const client = newClient();
    for (const reportType of ['shootout', 'penaltyShots'] as const) {
      await client.stats.skaterStatsWithQueryContext({
        queryContext: buildQuery([]),
        reportType,
      });
    }
    await client.stats.skaterStatsWithQueryContext({
      queryContext: buildQuery([], 'shootoutGamesPlayed>=1'),
      reportType: 'shootout',
    });
    await client.stats.skaterStatsWithQueryContext({
      queryContext: buildQuery([]),
      reportType: 'realtime',
    });
    assert.deepEqual(
      calledUrls(fetchSpy).map((url) => queryOf(url).factCayenneExp),
      ['', '', 'shootoutGamesPlayed>=1', 'gamesPlayed>=1'],
    );
  });
});

describe('Stats response types', () => {
  it('reportType selects the row type', async () => {
    mockFetch(() => ({ body: { data: [], total: 0 } }));
    const client = newClient();
    const queryContext = buildQuery([filter.season('20232024', '20232024')]);

    const bios = await client.stats.skaterStatsWithQueryContext({
      queryContext,
      reportType: 'bios',
    });
    assertType<
      Equals<(typeof bios)['data'][number], SkaterReportRows['bios']>
    >();

    const summary = await client.stats.goalieStatsSummary({
      startSeason: '20232024',
    });
    assertType<Equals<(typeof summary)[number], GoalieReportRows['summary']>>();

    const advanced = await client.stats.goalieStatsSummary({
      startSeason: '20232024',
      statsType: 'advanced',
    });
    assertType<
      Equals<(typeof advanced)[number], GoalieReportRows['advanced']>
    >();
  });

  it('rejects mismatched parameters', async () => {
    mockFetch();
    const client = newClient();
    const queryContext = buildQuery([]);

    await client.stats.skaterStatsWithQueryContext({
      queryContext,
      // @ts-expect-error unknown report types are rejected
      reportType: 'not-a-report',
    });
    await client.stats.skaterStatsWithQueryContext({
      // @ts-expect-error queryContext must be a QueryContext
      queryContext: 'gamesPlayed>1',
      reportType: 'summary',
    });
    await client.stats.goalieStatsSummary({
      // @ts-expect-error startSeason is an Id
      startSeason: true,
    });
  });
});
