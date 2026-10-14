import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('Standings', () => {
  it('leagueStandings defaults to now', async () => {
    const f = mockFetch();
    await newClient().standings.leagueStandings();
    assert.deepEqual(calledUrls(f), [
      'https://api-web.nhle.com/v1/standings/now',
    ]);
  });

  it('leagueStandings with a date', async () => {
    const f = mockFetch();
    await newClient().standings.leagueStandings({ date: '2024-01-01' });
    assert.deepEqual(calledUrls(f), [
      'https://api-web.nhle.com/v1/standings/2024-01-01',
    ]);
  });

  it('leagueStandings with a season uses the season end date', async () => {
    const f = mockFetch((url) =>
      url.endsWith('standings-season')
        ? { body: { seasons: [{ id: 20222023, standingsEnd: '2023-04-14' }] } }
        : {},
    );
    await newClient().standings.leagueStandings({
      season: '20222023',
      date: '2020-01-01',
    });
    assert.deepEqual(calledUrls(f), [
      'https://api-web.nhle.com/v1/standings-season',
      'https://api-web.nhle.com/v1/standings/2023-04-14',
    ]);
  });

  it('leagueStandings rejects unknown seasons', async () => {
    mockFetch(() => ({ body: { seasons: [] } }));
    await assert.rejects(
      newClient().standings.leagueStandings({ season: 19001901 }),
      {
        name: 'RangeError',
        message: 'Invalid Season Id 19001901',
      },
    );
  });

  it('seasonStandingManifest', async () => {
    const f = mockFetch(() => ({ body: { seasons: [{ id: 1 }] } }));
    assert.deepEqual(await newClient().standings.seasonStandingManifest(), [
      { id: 1 },
    ]);
    assert.deepEqual(calledUrls(f), [
      'https://api-web.nhle.com/v1/standings-season',
    ]);
  });
});
