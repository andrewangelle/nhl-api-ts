# Collect season-wide data (every game, every player)

`client.helpers` puts together data that the API only serves one team at a
time. Each method makes 30+ requests and sleeps between teams, so expect one
call to take 30 to 60 seconds. Progress messages go to stderr.

## Every game id in a season

```ts
import { createNHLClient } from 'nhl-api-ts';

const client = createNHLClient();

const ids = await client.helpers.gameIdsBySeason({
  season: 20232024,
  gameTypes: [2], // regular season only. Omit for all game types
});
const unique = [...new Set(ids)]; // each game appears once per team
```

`gameIdsBySeason` reads every team's season schedule, so each game shows up
twice (home and away). Always dedupe.

## Every rostered player

```ts
const players = await client.helpers.allPlayers({ season: 20232024 });
// each player: roster fields + team: 'TOR', firstName: 'Auston', lastName: 'Matthews'
```

`firstName` and `lastName` are flattened from `{ default: '...' }` to plain
strings. `team` is the abbreviation of the roster the player was listed on.
A player on more than one roster in the season appears once per roster.

## Skater stats merged with roster info

```ts
const rows = await client.helpers.allPlayersSummaryStatistics({
  season: 20232024,
  apiSleepRate: 1.5, // slower = fewer 429s
});
```

This method calls `allPlayers`, then the skater summary report per franchise,
then merges the two by player id. Stat fields win when keys collide. Goalies
are not included, because the skater summary report has none.

## Without helpers: one team at a time

When you only need some teams, call the endpoints directly. You make fewer
requests:

```ts
const schedule = await client.schedule.teamSeasonSchedule({
  teamAbbr: 'TOR',
  season: 20232024,
});
const gameIds = schedule.games
  .filter((game: { gameType: number }) => game.gameType === 2)
  .map((game: { id: number }) => game.id);
```

## Tuning

- `apiSleepRate` is the number of seconds to sleep before each team's request.
  Defaults: `gameIdsBySeason` 1, `allPlayers` 0.5,
  `allPlayersSummaryStatistics` 1. Raise it if you get
  `RateLimitExceededException`.
- Cache the results. Past seasons don't change.
- From the CLI: `nhl-api-ts helpers game-ids-by-season 20232024 --game-types 2 --api-sleep-rate 1.5`.
