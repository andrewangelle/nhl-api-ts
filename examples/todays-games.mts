/**
 * Games and scores for a date (defaults to today).
 *
 *   node examples/todays-games.mts
 *   node examples/todays-games.mts 2024-10-09
 */
import { NHLClient } from 'nhl-api-ts';

const client = new NHLClient();
const date = process.argv[2];

const schedule = await client.schedule.dailySchedule({ date });
console.log(`${schedule.date}: ${schedule.numberOfGames ?? 0} games`);

const scores = await client.gameCenter.dailyScores({ date: schedule.date });
for (const game of scores.games ?? []) {
  const away = `${game.awayTeam.abbrev} ${game.awayTeam.score ?? '-'}`;
  const home = `${game.homeTeam.abbrev} ${game.homeTeam.score ?? '-'}`;
  console.log(`  ${game.id}  ${away} @ ${home}  [${game.gameState}]`);
}
