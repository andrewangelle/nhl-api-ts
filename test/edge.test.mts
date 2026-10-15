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
];

const landingEndpoints: [EdgeMethod, string][] = [
  ['skaterLanding', 'edge/skater-landing'],
  ['goalieLanding', 'edge/goalie-landing'],
  ['teamLanding', 'edge/team-landing'],
];

// biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over edge methods
const call = (client: NHLClient, method: EdgeMethod, params?: any) =>
  // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch over edge methods
  (client.edge[method] as any).call(client.edge, params);

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

  it('covers every Edge method', () => {
    const methods = Object.keys(newClient().edge);
    const tested = [
      ...playerEndpoints,
      ...teamEndpoints,
      ...landingEndpoints,
    ].map(([methodName]) => methodName);
    assert.deepEqual([...methods].sort(), [...tested].sort());
  });
});
