import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import type { NHLClient } from '#src/index.mjs';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

const WEB = 'https://api-web.nhle.com/v1/';

type EdgeMethod = keyof NHLClient['edge'];

const playerEndpoints: [EdgeMethod, string][] = [
  ['skaterDetail', 'edge/skater-detail'],
  ['skaterShotSpeedDetail', 'edge/skater-shot-speed-detail'],
  ['skaterSkatingSpeedDetail', 'edge/skater-skating-speed-detail'],
  ['skaterShotLocationDetail', 'edge/skater-shot-location-detail'],
  ['skaterSkatingDistanceDetail', 'edge/skater-skating-distance-detail'],
  ['skaterComparison', 'edge/skater-comparison'],
  ['skaterZoneTime', 'edge/skater-zone-time'],
  ['catSkaterDetail', 'cat/edge/skater-detail'],
  ['goalieDetail', 'edge/goalie-detail'],
  ['goalieShotLocationDetail', 'edge/goalie-shot-location-detail'],
  ['goalie5v5Detail', 'edge/goalie-5v5-detail'],
  ['goalieComparison', 'edge/goalie-comparison'],
  ['goalieSavePercentageDetail', 'edge/goalie-save-percentage-detail'],
  ['catGoalieDetail', 'cat/edge/goalie-detail'],
];

const teamEndpoints: [EdgeMethod, string][] = [
  ['teamDetail', 'edge/team-detail'],
  ['teamSkatingDistanceDetail', 'edge/team-skating-distance-detail'],
  ['teamZoneTimeDetails', 'edge/team-zone-time-details'],
  ['teamShotLocationDetail', 'edge/team-shot-location-detail'],
  ['teamShotSpeedDetail', 'edge/team-shot-speed-detail'],
  ['teamSkatingSpeedDetail', 'edge/team-skating-speed-detail'],
  ['teamComparison', 'edge/team-comparison'],
];

const landingEndpoints: [EdgeMethod, string][] = [
  ['skaterLanding', 'edge/skater-landing'],
  ['goalieLanding', 'edge/goalie-landing'],
  ['teamLanding', 'edge/team-landing'],
  ['byTheNumbers', 'edge/by-the-numbers'],
];

// [method, params, path with defaults applied, path with every slot given]
const top10Endpoints: [EdgeMethod, object, string, object, string][] = [
  [
    'skaterDistanceTop10',
    { sortBy: 'total' },
    'edge/skater-distance-top-10/all/all/total',
    { positions: 'defense', strength: 'pp', sortBy: 'max-game' },
    'edge/skater-distance-top-10/defense/pp/max-game',
  ],
  [
    'skaterSpeedTop10',
    { sortBy: 'max' },
    'edge/skater-speed-top-10/all/max',
    { positions: 'forwards', sortBy: 'over-22' },
    'edge/skater-speed-top-10/forwards/over-22',
  ],
  [
    'skaterZoneTimeTop10',
    { sortBy: 'offensive' },
    'edge/skater-zone-time-top-10/all/all/offensive',
    { positions: 'forwards', strength: 'es', sortBy: 'defensive' },
    'edge/skater-zone-time-top-10/forwards/es/defensive',
  ],
  [
    'skaterShotSpeedTop10',
    { sortBy: 'max' },
    'edge/skater-shot-speed-top-10/all/max',
    { positions: 'defense', sortBy: '90-99' },
    'edge/skater-shot-speed-top-10/defense/90-99',
  ],
  [
    'skaterShotLocationTop10',
    { sortBy: 'sog' },
    'edge/skater-shot-location-top-10/all/sog/all',
    { positions: 'forwards', sortBy: 'goals', category: 'high' },
    'edge/skater-shot-location-top-10/forwards/goals/high',
  ],
  [
    'goalie5v5Top10',
    { sortBy: 'save-pctg' },
    'edge/goalie-5v5-top-10/save-pctg',
    { sortBy: 'shots-per-60' },
    'edge/goalie-5v5-top-10/shots-per-60',
  ],
  [
    'goalieShotLocationTop10',
    { sortBy: 'saves' },
    'edge/goalie-shot-location-top-10/saves/all',
    { sortBy: 'goals-against', category: 'long' },
    'edge/goalie-shot-location-top-10/goals-against/long',
  ],
  [
    'goalieSavePercentageTop10',
    { sortBy: 'games' },
    'edge/goalie-edge-save-pctg-top-10/games',
    { sortBy: 'pctg' },
    'edge/goalie-edge-save-pctg-top-10/pctg',
  ],
  [
    'teamSkatingDistanceTop10',
    { sortBy: 'per-60' },
    'edge/team-skating-distance-top-10/all/all/per-60',
    { positions: 'forwards', strength: 'pk', sortBy: 'max-period' },
    'edge/team-skating-distance-top-10/forwards/pk/max-period',
  ],
  [
    'teamSkatingSpeedTop10',
    { sortBy: 'max' },
    'edge/team-skating-speed-top-10/all/max',
    { positions: 'defense', sortBy: '18-20' },
    'edge/team-skating-speed-top-10/defense/18-20',
  ],
  [
    'teamZoneTimeTop10',
    { sortBy: 'neutral' },
    'edge/team-zone-time-top-10/all/neutral',
    { strength: 'es', sortBy: 'offensive' },
    'edge/team-zone-time-top-10/es/offensive',
  ],
  [
    'teamShotSpeedTop10',
    { sortBy: 'max' },
    'edge/team-shot-speed-top-10/all/max',
    { positions: 'forwards', sortBy: 'over-100' },
    'edge/team-shot-speed-top-10/forwards/over-100',
  ],
  [
    'teamShotLocationTop10',
    { sortBy: 'shooting-pctg' },
    'edge/team-shot-location-top-10/all/shooting-pctg/all',
    { positions: 'defense', sortBy: 'sog', category: 'mid' },
    'edge/team-shot-location-top-10/defense/sog/mid',
  ],
];

// biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over edge methods
function call(client: NHLClient, method: EdgeMethod, params?: any) {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over edge methods
  return (client.edge[method] as any).call(client.edge, params);
}

async function urlFor(method: EdgeMethod, params?: object): Promise<string> {
  const fetchSpy = mockFetch();
  await call(newClient(), method, params);
  const urls = calledUrls(fetchSpy);
  mock.restoreAll();
  assert.equal(urls.length, 1);
  return urls[0];
}

describe('Edge', () => {
  for (const [method, path] of playerEndpoints) {
    it(`${method}`, async () => {
      assert.equal(
        await urlFor(method, { playerId: 8478402 }),
        `${WEB}${path}/8478402/now`,
      );
      assert.equal(
        await urlFor(method, {
          playerId: 8478402,
          season: 20232024,
          gameType: 3,
        }),
        `${WEB}${path}/8478402/20232024/3`,
      );
      // gameType defaults to 2 once a season is given
      assert.equal(
        await urlFor(method, { playerId: 8478402, season: '20242025' }),
        `${WEB}${path}/8478402/20242025/2`,
      );
    });
  }

  for (const [method, path] of teamEndpoints) {
    it(`${method}`, async () => {
      assert.equal(
        await urlFor(method, { teamId: 10 }),
        `${WEB}${path}/10/now`,
      );
      assert.equal(
        await urlFor(method, { teamId: 10, season: 20232024, gameType: 2 }),
        `${WEB}${path}/10/20232024/2`,
      );
    });
  }

  for (const [method, path] of landingEndpoints) {
    it(`${method}`, async () => {
      assert.equal(await urlFor(method), `${WEB}${path}/now`);
      assert.equal(
        await urlFor(method, { season: 20232024, gameType: 3 }),
        `${WEB}${path}/20232024/3`,
      );
    });
  }

  for (const [
    method,
    defaults,
    defaultPath,
    full,
    fullPath,
  ] of top10Endpoints) {
    it(`${method}`, async () => {
      assert.equal(await urlFor(method, defaults), `${WEB}${defaultPath}/now`);
      assert.equal(
        await urlFor(method, { ...full, season: 20242025, gameType: 3 }),
        `${WEB}${fullPath}/20242025/3`,
      );
      // gameType defaults to 2 once a season is given
      assert.equal(
        await urlFor(method, { ...defaults, season: '20252026' }),
        `${WEB}${defaultPath}/20252026/2`,
      );
    });
  }

  it('covers every Edge method', () => {
    const methods = Object.keys(newClient().edge);
    const tested = [
      ...playerEndpoints,
      ...teamEndpoints,
      ...landingEndpoints,
      ...top10Endpoints,
    ].map(([methodName]) => methodName);
    assert.deepEqual([...methods].sort(), [...tested].sort());
  });
});
