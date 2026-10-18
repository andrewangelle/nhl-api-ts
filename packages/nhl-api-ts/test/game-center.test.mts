import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const SHIFT_BASE =
  "https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId=2020020001 and ((duration != '00:00' and typeCode = 517) or typeCode != 517 )";

describe('GameCenter', () => {
  const cases: [
    string,
    (client: ReturnType<typeof newClient>) => Promise<unknown>,
    string,
  ][] = [
    [
      'boxscore',
      (client) => client.gameCenter.boxscore({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/boxscore',
    ],
    [
      'playByPlay',
      (client) => client.gameCenter.playByPlay({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/play-by-play',
    ],
    [
      'matchUp',
      (client) => client.gameCenter.matchUp({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/landing',
    ],
    [
      'dailyScores (now)',
      (client) => client.gameCenter.dailyScores(),
      'https://api-web.nhle.com/v1/score/now',
    ],
    [
      'dailyScores (date)',
      (client) => client.gameCenter.dailyScores({ date: '2023-10-15' }),
      'https://api-web.nhle.com/v1/score/2023-10-15',
    ],
    [
      'shiftChartData (default excludes)',
      (client) => client.gameCenter.shiftChartData({ gameId: '2020020001' }),
      `${SHIFT_BASE}&exclude=eventDetails`,
    ],
    [
      'shiftChartData (custom excludes)',
      (client) =>
        client.gameCenter.shiftChartData({
          gameId: '2020020001',
          excludes: ['eventDetails', 'playerStats'],
        }),
      `${SHIFT_BASE}&exclude=eventDetails,playerStats`,
    ],
    [
      'shiftChartData (empty excludes)',
      (client) =>
        client.gameCenter.shiftChartData({
          gameId: '2020020001',
          excludes: [],
        }),
      `${SHIFT_BASE}&exclude=`,
    ],
    [
      'seasonSeriesMatchup',
      (client) =>
        client.gameCenter.seasonSeriesMatchup({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/right-rail',
    ],
    [
      'gameStory',
      (client) => client.gameCenter.gameStory({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/wsc/game-story/2020020001',
    ],
  ];

  for (const [name, call, url] of cases) {
    it(name, async () => {
      const fetchSpy = mockFetch();
      await call(newClient());
      assert.deepEqual(calledUrls(fetchSpy), [url]);
    });
  }
});
