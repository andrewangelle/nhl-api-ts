/**
 * NHL EDGE tracking data for a skater (default: Connor McDavid).
 *
 *   node examples/edge-tracking.mts
 *   node examples/edge-tracking.mts 8478402 20232024 3
 */
import { NHLClient } from 'nhl-api-ts';

const client = new NHLClient();
const [playerId = '8478402', season = '20232024', gameType = '2'] =
  process.argv.slice(2);

const params = { playerId, season, gameType: Number(gameType) };

const detail = await client.edge.skaterDetail(params);
const speed = await client.edge.skaterSkatingSpeedDetail(params);

console.log(
  `${detail.player.firstName.default} ${detail.player.lastName.default}, ${season} (game type ${gameType})`,
);
console.log(`  top-level keys (detail): ${Object.keys(detail).join(', ')}`);
console.log(`  top-level keys (speed):  ${Object.keys(speed).join(', ')}`);

// Omit `season` to get the current season: the SDK requests ".../now".
const current = await client.edge.skaterLanding();
console.log(`  current landing keys: ${Object.keys(current).join(', ')}`);
