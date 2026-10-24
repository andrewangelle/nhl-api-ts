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

describe('Players', () => {
  it('prospectsByTeam', async () => {
    const fetchSpy = mockFetch(() => ({
      body: { prospects: [{ name: 'Test Prospect' }] },
    }));
    const result = await newClient().players.prospectsByTeam({
      teamAbbr: 'BUF',
    });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/prospects/BUF',
    ]);
    assert.deepEqual(result, { prospects: [{ name: 'Test Prospect' }] });
  });

  it('playersByTeam', async () => {
    const fetchSpy = mockFetch(() => ({
      body: { roster: [{ name: 'Test Player' }] },
    }));
    const result = await newClient().players.playersByTeam({
      teamAbbr: 'BUF',
      season: '20202021',
    });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster/BUF/20202021',
    ]);
    assert.deepEqual(result, { roster: [{ name: 'Test Player' }] });
  });

  it('playersByTeam defaults to current', async () => {
    const fetchSpy = mockFetch();
    await newClient().players.playersByTeam({ teamAbbr: 'BUF' });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster/BUF/current',
    ]);
  });

  it('playerSpotlight', async () => {
    const fetchSpy = mockFetch(() => ({ body: [{ playerId: 1 }] }));
    const result = await newClient().players.playerSpotlight();
    assert.deepEqual(result, [{ playerId: 1 }]);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/player-spotlight',
    ]);
  });

  it('playersByTeam matches teams.teamRoster', async () => {
    const body = { roster: [{ name: 'Test Player', position: 'C' }] };
    const fetchSpy = mockFetch(() => ({ body }));
    const client = newClient();
    const players = await client.players.playersByTeam({
      teamAbbr: 'TOR',
      season: '20232024',
    });
    const teams = await client.teams.teamRoster({
      teamAbbr: 'TOR',
      season: '20232024',
    });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster/TOR/20232024',
      'https://api-web.nhle.com/v1/roster/TOR/20232024',
    ]);
    assert.deepEqual(players, teams);
    assert.deepEqual(players, body);
  });
});

describe('Players: stats API search', () => {
  const PLAYERS = 'https://api.nhle.com/stats/rest/en/players';

  async function searchExp(
    params: Parameters<
      ReturnType<typeof newClient>['players']['playerSearch']
    >[0],
  ): Promise<string> {
    const fetchSpy = mockFetch();
    await newClient().players.playerSearch(params);
    const [url] = calledUrls(fetchSpy);
    assert.equal(pathOf(url), PLAYERS);
    return queryOf(url).cayenneExp;
  }

  it('name is a case-insensitive fullName match', async () => {
    assert.equal(
      await searchExp({ name: ' matth ' }),
      "fullName likeIgnoreCase '%matth%'",
    );
  });

  it('name escapes quotes and backslashes', async () => {
    assert.equal(
      await searchExp({ name: "O'Reilly\\" }),
      "fullName likeIgnoreCase '%O\\'Reilly\\\\%'",
    );
  });

  it('teamId filters on currentTeamId', async () => {
    assert.equal(await searchExp({ teamId: 10 }), 'currentTeamId=10');
  });

  it('position F expands to every forward', async () => {
    assert.equal(
      await searchExp({ position: 'F' }),
      "(positionCode='L' or positionCode='R' or positionCode='C')",
    );
    assert.equal(await searchExp({ position: 'G' }), "positionCode='G'");
  });

  it('joins every filter with and', async () => {
    assert.equal(
      await searchExp({
        name: 'smith',
        teamId: '7',
        position: 'D',
        cayenneExp: 'sweaterNumber=4 or sweaterNumber=5',
      }),
      "(fullName likeIgnoreCase '%smith%') and (currentTeamId=7) and (positionCode='D') and (sweaterNumber=4 or sweaterNumber=5)",
    );
  });

  it('returns the full page', async () => {
    mockFetch(() => ({ body: { data: [], total: 0 } }));
    assert.deepEqual(await newClient().players.playerSearch({ name: 'zzz' }), {
      data: [],
      total: 0,
    });
  });

  it('sends sort, dir, start and repeats include/exclude', async () => {
    const fetchSpy = mockFetch();
    await newClient().players.playerSearch({
      teamId: 10,
      sort: 'lastName',
      dir: 'DESC',
      start: 5,
      include: ['id', 'fullName'],
      exclude: ['sweaterNumber'],
    });
    assert.deepEqual(calledUrls(fetchSpy), [
      `${PLAYERS}?cayenneExp=currentTeamId%3D10&sort=lastName&dir=DESC&start=5&include=id&include=fullName&exclude=sweaterNumber`,
    ]);
  });

  it('omits empty include/exclude', async () => {
    const fetchSpy = mockFetch();
    await newClient().players.playerSearch({
      cayenneExp: 'id=8479318',
      include: [],
      exclude: [],
    });
    assert.deepEqual(queryOf(calledUrls(fetchSpy)[0]), {
      cayenneExp: 'id=8479318',
    });
  });

  it('rejects a search without a filter, without a request', async () => {
    const fetchSpy = mockFetch();
    for (const params of [{}, { name: ' ', cayenneExp: '' }]) {
      await assert.rejects(
        newClient().players.playerSearch(params),
        RangeError,
      );
    }
    assert.equal(fetchSpy.mock.callCount(), 0);
  });
});
