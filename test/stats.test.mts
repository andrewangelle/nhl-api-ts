import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
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
