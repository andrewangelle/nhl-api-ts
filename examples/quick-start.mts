/**
 * Client setup, the team list, standings and a roster.
 *
 *   node examples/quick-start.mts
 */
import { NHLClient } from 'nhl-api-ts';

const client = new NHLClient({ timeout: 20 });

const teams = await client.teams.teams();
console.log(`${teams.length} teams`);
for (const team of teams.slice(0, 3)) {
  console.log(
    `  ${team.abbr}  ${team.name}  (${team.division.name}, franchise ${team.franchise_id})`,
  );
}

const { standings } = await client.standings.leagueStandings({
  season: 20232024,
});
const leader = standings[0];
console.log(
  `2023-24 points leader: ${leader.teamName.default} (${leader.points} pts)`,
);

const roster = await client.teams.teamRoster({
  teamAbbr: 'TOR',
  season: 20232024,
});
const names = roster.forwards.map(
  (player: { firstName: { default: string }; lastName: { default: string } }) =>
    `${player.firstName.default} ${player.lastName.default}`,
);
console.log(`TOR forwards: ${names.join(', ')}`);
