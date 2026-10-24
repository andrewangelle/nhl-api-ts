import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { toTeam, withFranchiseIds } from '#src/api/teams.mjs';
import { ResourceNotFoundException } from '#src/index.mjs';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('toTeam', () => {
  it('maps a standings entry to a Team', () => {
    assert.deepEqual(
      toTeam({
        conferenceAbbrev: 'E',
        conferenceName: 'Eastern',
        divisionAbbrev: 'A',
        divisionName: 'Atlantic',
        teamName: { default: 'Boston Bruins' },
        teamCommonName: { default: 'Bruins' },
        teamAbbrev: { default: 'BOS' },
        teamLogo: 'https://assets.nhle.com/logos/nhl/svg/BOS_light.svg',
      }),
      {
        conference: { abbr: 'E', name: 'Eastern' },
        division: { abbr: 'A', name: 'Atlantic' },
        name: 'Boston Bruins',
        common_name: 'Bruins',
        abbr: 'BOS',
        logo: 'https://assets.nhle.com/logos/nhl/svg/BOS_light.svg',
      },
    );
  });

  it('defaults missing fields to empty strings', () => {
    assert.deepEqual(toTeam({}), {
      conference: { abbr: '', name: '' },
      division: { abbr: '', name: '' },
      name: '',
      common_name: '',
      abbr: '',
      logo: '',
    });
  });
});

describe('withFranchiseIds', () => {
  it('adds franchise_id on a matching name', () => {
    const teams = withFranchiseIds(
      [toTeam({ teamName: { default: 'Boston Bruins' } })],
      [{ id: 6, fullName: 'Boston Bruins' }],
    );
    assert.equal(teams[0].franchise_id, 6);
  });

  it('matches Canadiens and Utah despite name mismatches', () => {
    const teams = withFranchiseIds(
      [toTeam({ teamName: { default: 'Montreal Canadiens' } })],
      [{ id: 1, fullName: 'Montréal Canadiens' }],
    );
    assert.equal(teams[0].franchise_id, 1);
  });

  it('leaves franchise_id out entirely when there is no match', () => {
    const teams = withFranchiseIds(
      [toTeam({ teamName: { default: 'New Team' } })],
      [{ id: 6, fullName: 'Boston Bruins' }],
    );
    assert.equal('franchise_id' in teams[0], false);
  });
});

function standing(
  conf: [string, string],
  div: [string, string],
  name: string,
  common: string,
  abbr: string,
) {
  return {
    conferenceAbbrev: conf[0],
    conferenceName: conf[1],
    divisionAbbrev: div[0],
    divisionName: div[1],
    teamName: { default: name },
    teamCommonName: { default: common },
    teamAbbrev: { default: abbr },
    teamLogo: `https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`,
  };
}

describe('Teams', () => {
  it('teamRoster', async () => {
    const fetchSpy = mockFetch();
    await newClient().teams.teamRoster({ teamAbbr: 'BUF', season: '20202021' });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster/BUF/20202021',
    ]);
  });

  it('teamRoster defaults to current', async () => {
    const fetchSpy = mockFetch();
    await newClient().teams.teamRoster({ teamAbbr: 'BUF' });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster/BUF/current',
    ]);
  });

  it('rosterSeasons', async () => {
    const fetchSpy = mockFetch(() => ({ body: [20222023, 20232024] }));
    const seasons = await newClient().teams.rosterSeasons({ teamAbbr: 'TOR' });
    assert.deepEqual(seasons, [20222023, 20232024]);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/roster-season/TOR',
    ]);
  });

  it('teamScoreboard', async () => {
    const fetchSpy = mockFetch();
    await newClient().teams.teamScoreboard({ teamAbbr: 'TOR' });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api-web.nhle.com/v1/scoreboard/TOR/now',
    ]);
  });

  it('franchises', async () => {
    const fetchSpy = mockFetch(() => ({ body: { data: [{ id: 1 }] } }));
    assert.deepEqual(await newClient().teams.franchises(), [{ id: 1 }]);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/franchise',
    ]);
  });

  it('teams merges standings with franchise ids', async () => {
    const eastern: [string, string] = ['E', 'Eastern'];
    const western: [string, string] = ['W', 'Western'];
    const fetchSpy = mockFetch((url) => {
      if (url.includes('standings')) {
        return {
          body: {
            standings: [
              standing(
                eastern,
                ['A', 'Atlantic'],
                'Boston Bruins',
                'Bruins',
                'BOS',
              ),
              standing(
                western,
                ['C', 'Central'],
                'Colorado Avalanche',
                'Avalanche',
                'COL',
              ),
              standing(
                eastern,
                ['A', 'Atlantic'],
                'Montreal Canadiens',
                'Canadiens',
                'MTL',
              ),
              standing(
                eastern,
                ['M', 'Metropolitan'],
                'New Team',
                'New Team',
                'NEW',
              ),
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

    const urls = calledUrls(fetchSpy);
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
    const fetchSpy = mockFetch();
    await newClient().teams.teams({ date: '2024-01-01' });
    assert.match(calledUrls(fetchSpy)[0], /standings\/2024-01-01$/);
  });
});

describe('Teams: stats API', () => {
  it('statsTeams unwraps data', async () => {
    const row = { id: 10, triCode: 'TOR' };
    const fetchSpy = mockFetch(() => ({ body: { data: [row], total: 1 } }));
    assert.deepEqual(await newClient().teams.statsTeams(), [row]);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/team',
    ]);
  });

  it('teamById returns the single row', async () => {
    const row = { id: 10, triCode: 'TOR' };
    const fetchSpy = mockFetch(() => ({ body: { data: [row], total: 1 } }));
    assert.deepEqual(await newClient().teams.teamById({ teamId: 10 }), row);
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/team/id/10',
    ]);
  });

  it('teamById throws ResourceNotFoundException for an unknown id', async () => {
    mockFetch(() => ({ status: 404, body: { message: 'Not found' } }));
    await assert.rejects(
      newClient().teams.teamById({ teamId: 999 }),
      ResourceNotFoundException,
    );
  });
});
