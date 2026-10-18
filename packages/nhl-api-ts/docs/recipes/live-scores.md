# Today's games and live scores

## Today's schedule

```ts
import { createNHLClient } from 'nhl-api-ts';

const client = createNHLClient();

const today = await client.schedule.dailySchedule();
console.log(today.date, today.numberOfGames ?? 0);
for (const game of today.games ?? []) {
  console.log(game.id, game.awayTeam.abbrev, '@', game.homeTeam.abbrev, game.gameState);
}
```

`dailySchedule()` with no date uses **local** today. On a server running in
UTC, "today" can roll over before North American games finish. Pass an
explicit date when that matters: `dailySchedule({ date: '2024-10-09' })`.
`games` and `numberOfGames` are missing (not empty) on days with no games.

## Scores for a day

```ts
const scores = await client.gameCenter.dailyScores(); // "now" -> redirect to today
for (const game of scores.games ?? []) {
  console.log(
    `${game.awayTeam.abbrev} ${game.awayTeam.score ?? '-'} @ ${game.homeTeam.abbrev} ${game.homeTeam.score ?? '-'}  ${game.gameState}`,
  );
}
```

`gameState` values you'll see: `FUT` (scheduled), `PRE` (pregame), `LIVE`,
`CRIT` (final minutes of a close game), `FINAL`, `OFF` (official/final).

## One game in detail

```ts
const gameId = 2023020280;
const landing = await client.gameCenter.matchUp({ gameId });   // summary, scoring by period, three stars
const box = await client.gameCenter.boxscore({ gameId });      // per-player stats
const pbp = await client.gameCenter.playByPlay({ gameId });    // every event
```

## Polling

There is no push or websocket API. Poll `dailyScores()` or
`matchUp({ gameId })`, and keep the interval reasonable (15 to 30 seconds) so
you don't hit rate limits.

```ts
import { setTimeout as delay } from 'node:timers/promises';

while (true) {
  const { games = [] } = await client.gameCenter.dailyScores();
  if (games.every((game: { gameState: string }) => ['FINAL', 'OFF'].includes(game.gameState))) {
    break;
  }
  // render...
  await delay(30_000);
}
```

## CLI

```bash
nhl-api-ts schedule daily-schedule --compact | jq '.games[] | {id, away: .awayTeam.abbrev, home: .homeTeam.abbrev}'
nhl-api-ts game-center daily-scores --date 2024-10-09 --compact | jq '.games[] | [.awayTeam.abbrev, .awayTeam.score, .homeTeam.abbrev, .homeTeam.score]'
```

Runnable version: [`examples/todays-games.mts`](../../examples/todays-games.mts).
