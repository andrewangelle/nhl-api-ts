import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const SHIFT_BASE =
  "https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId=2020020001 and ((duration != '00:00' and typeCode = 517) or typeCode != 517 )";

describe('GameCenter', () => {
  const cases: [
    string,
    (c: ReturnType<typeof newClient>) => Promise<unknown>,
    string,
  ][] = [
    [
      'boxscore',
      (c) => c.gameCenter.boxscore({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/boxscore',
    ],
    [
      'playByPlay',
      (c) => c.gameCenter.playByPlay({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/play-by-play',
    ],
    [
      'matchUp',
      (c) => c.gameCenter.matchUp({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/landing',
    ],
    [
      'dailyScores (now)',
      (c) => c.gameCenter.dailyScores(),
      'https://api-web.nhle.com/v1/score/now',
    ],
    [
      'dailyScores (date)',
      (c) => c.gameCenter.dailyScores({ date: '2023-10-15' }),
      'https://api-web.nhle.com/v1/score/2023-10-15',
    ],
    [
      'shiftChartData (default excludes)',
      (c) => c.gameCenter.shiftChartData({ gameId: '2020020001' }),
      `${SHIFT_BASE}&exclude=eventDetails`,
    ],
    [
      'shiftChartData (custom excludes)',
      (c) =>
        c.gameCenter.shiftChartData({
          gameId: '2020020001',
          excludes: ['eventDetails', 'playerStats'],
        }),
      `${SHIFT_BASE}&exclude=eventDetails,playerStats`,
    ],
    [
      'shiftChartData (empty excludes)',
      (c) =>
        c.gameCenter.shiftChartData({ gameId: '2020020001', excludes: [] }),
      `${SHIFT_BASE}&exclude=`,
    ],
    [
      'seasonSeriesMatchup',
      (c) => c.gameCenter.seasonSeriesMatchup({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/gamecenter/2020020001/right-rail',
    ],
    [
      'gameStory',
      (c) => c.gameCenter.gameStory({ gameId: '2020020001' }),
      'https://api-web.nhle.com/v1/wsc/game-story/2020020001',
    ],
  ];

  for (const [name, call, url] of cases) {
    it(name, async () => {
      const f = mockFetch();
      await call(newClient());
      assert.deepEqual(calledUrls(f), [url]);
    });
  }
});
