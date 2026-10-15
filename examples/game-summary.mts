/**
 * Boxscore and goal timeline for one game.
 *
 *   node examples/game-summary.mts 2023020280
 */
import { createNHLClient } from 'nhl-api-ts';

const client = createNHLClient();
const gameId = process.argv[2] ?? '2023020280';

const box = await client.gameCenter.boxscore({ gameId });
console.log(
  `${box.awayTeam.abbrev} ${box.awayTeam.score} @ ${box.homeTeam.abbrev} ${box.homeTeam.score}  (${box.gameDate})`,
);

const pbp = await client.gameCenter.playByPlay({ gameId });
const goals = pbp.plays.filter(
  (play: { typeDescKey: string }) => play.typeDescKey === 'goal',
);
for (const goal of goals) {
  console.log(
    `  P${goal.periodDescriptor.number} ${goal.timeInPeriod}  goal by player ${goal.details.scoringPlayerId}`,
  );
}
