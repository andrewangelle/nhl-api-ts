import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const standing = (
  conf: [string, string],
  div: [string, string],
  name: string,
  common: string,
  abbr: string,
) => ({
  conferenceAbbrev: conf[0],
  conferenceName: conf[1],
  divisionAbbrev: div[0],
  divisionName: div[1],
  teamName: { default: name },
  teamCommonName: { default: common },
  teamAbbrev: { default: abbr },
  teamLogo: `https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`,
});

describe('Teams', () => {
  it('teamRoster', async () => {
    const f = mockFetch();
    await newClient().teams.teamRoster({ teamAbbr: 'BUF', season: '20202021' });
    assert.deepEqual(calledUrls(f), [
      'https://api-web.nhle.com/v1/roster/BUF/20202021',
    ]);
  });

  it('franchises', async () => {
    const f = mockFetch(() => ({ body: { data: [{ id: 1 }] } }));
    assert.deepEqual(await newClient().teams.franchises(), [{ id: 1 }]);
    assert.deepEqual(calledUrls(f), [
      'https://api.nhle.com/stats/rest/en/franchise',
    ]);
  });

  it('teams merges standings with franchise ids', async () => {
    const E: [string, string] = ['E', 'Eastern'];
    const W: [string, string] = ['W', 'Western'];
    const f = mockFetch((url) => {
      if (url.includes('standings')) {
        return {
          body: {
            standings: [
              standing(E, ['A', 'Atlantic'], 'Boston Bruins', 'Bruins', 'BOS'),
              standing(
                W,
                ['C', 'Central'],
                'Colorado Avalanche',
                'Avalanche',
                'COL',
              ),
              standing(
                E,
                ['A', 'Atlantic'],
                'Montreal Canadiens',
                'Canadiens',
                'MTL',
              ),
              standing(E, ['M', 'Metropolitan'], 'New Team', 'New Team', 'NEW'),
            ],
          },
        };
      }
      return {
        body: {
          data: [
            { id: 6, fullName: 'Boston Bruins', teamCommonName: 'Bruins' },
            {
              id: 27,
              fullName: 'Colorado Avalanche',
              teamCommonName: 'Avalanche',
            },
            // Note the accent, different from "Montreal Canadiens"
            {
              id: 1,
              fullName: 'Montréal Canadiens',
              teamCommonName: 'Canadiens',
            },
          ],
        },
      };
    });

    const teams = await newClient().teams.teams();

    const urls = calledUrls(f);
    assert.equal(urls.length, 2);
    assert.match(urls[0], /standings\/now$/);
    assert.match(urls[1], /franchise/);

    assert.equal(teams.length, 4);
    assert.deepEqual(teams[0], {
      conference: { abbr: 'E', name: 'Eastern' },
      division: { abbr: 'A', name: 'Atlantic' },
      name: 'Boston Bruins',
      common_name: 'Bruins',
      abbr: 'BOS',
      logo: 'https://assets.nhle.com/logos/nhl/svg/BOS_light.svg',
      franchise_id: 6,
    });
    assert.equal(teams[1].franchise_id, 27);
    assert.equal(teams[1].division.name, 'Central');
    // Partial match special case for the Canadiens
    assert.equal(teams[2].name, 'Montreal Canadiens');
    assert.equal(teams[2].franchise_id, 1);
    // No franchise match: key is absent
    assert.equal(teams[3].abbr, 'NEW');
    assert.equal('franchise_id' in teams[3], false);
  });

  it('teams accepts a date', async () => {
    const f = mockFetch();
    await newClient().teams.teams({ date: '2024-01-01' });
    assert.match(calledUrls(f)[0], /standings\/2024-01-01$/);
  });
});
