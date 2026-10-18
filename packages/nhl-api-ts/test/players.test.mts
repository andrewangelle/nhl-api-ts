import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

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
