---
name: nhl-api-ts
description: Fetch NHL data (teams, rosters, schedules, scores, boxscores, play-by-play, standings, player and team stats, NHL EDGE tracking) with the nhl-api-ts TypeScript SDK or its CLI. Use when writing code or shell commands that need NHL hockey data, or when working with code that imports nhl-api-ts.
---

# Using nhl-api-ts

`nhl-api-ts` wraps the public, unauthenticated NHL APIs. It runs on Node.js
>= 24, ships as ESM only, and has no API key.

```ts
import { createNHLClient } from 'nhl-api-ts';
const client = createNHLClient(); // options: { debug, timeout (s), followRedirects }
```

For a one-off lookup, the CLI is often faster than writing code:

```bash
npx nhl-api-ts <module> <command> [required args] [--options] --compact | jq ...
npx nhl-api-ts <module> <command> --help
```

## Pick the right method

| You want                                   | Call                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Team list, abbreviations, franchise ids    | `teams.teams()` returns `Team[]` with `abbr`, `name`, `franchise_id` |
| A roster                                   | `teams.teamRoster({ teamAbbr, season })` returns `{ forwards, defensemen, goalies }` |
| Games on a date                            | `schedule.dailySchedule({ date? })` returns `{ date, games?, numberOfGames? }` |
| Live or final scores for a date            | `gameCenter.dailyScores({ date? })` returns `{ games: [{ gameState, awayTeam.score, ... }] }` |
| A team's season schedule or game ids       | `schedule.teamSeasonSchedule({ teamAbbr, season })` returns `.games` |
| One game                                   | `gameCenter.boxscore` / `playByPlay` / `matchUp({ gameId })`         |
| Standings                                  | `standings.leagueStandings({ date?, season? })` returns `.standings` |
| A player's career totals or bio            | `stats.playerCareerStats({ playerId })`                              |
| A player's game-by-game log                | `stats.playerGameLog({ playerId, seasonId, gameType })`              |
| Leaderboards, filtered skater stats        | `stats.skaterStatsWithQueryContext` + `buildQuery`/`filter.*` (see below) |
| Simple skater, goalie or team leaderboards | `stats.skaterStatsSummary` / `goalieStatsSummary` / `teamSummary`    |
| Speed, distance, zone time, shot speed     | `edge.*` (`skaterDetail`, `skaterSkatingSpeedDetail`, `teamDetail`, ...) |
| Every game id or every player in a season  | `helpers.gameIdsBySeason` / `helpers.allPlayers` (slow, 30+ requests) |
| Country codes for nationality filters      | `misc.countries()`                                                   |

Every method is `async` and takes **one options object** with camelCase keys.
Responses are the NHL's JSON, passed through untouched and typed with named
interfaces (`Boxscore`, `PlayByPlay`, `SkaterReportRows['summary']`, ...) that
you can extend by module augmentation (see the extending-response-types
recipe). Name fields are localized:
read `player.firstName.default`, not `player.firstName`.

## Identifier formats (the most common source of 404s)

- Season: `20232024` (8 digits). **Not** `2023` or `2023-24`.
- Game id: `2023020280`, which is season start year + game type `02` + number.
- Game type: `1` preseason, `2` regular season, `3` playoffs.
- Date: `YYYY-MM-DD`.
- `teamAbbr` (`TOR`) is used by web endpoints. `teamId` (`10`) is used by
  `edge.team*`. `franchiseId` (`5`) is used by stats filters. All three are
  different numbering schemes. Get franchise ids from `teams.teams()` (`franchise_id`).
- Omitting `date` or `season` means "current". The SDK sends `now` and follows
  the API's 307 redirect.

## Filtered stats

```ts
import { buildQuery, filter, isValidQuery, PositionTypes } from 'nhl-api-ts';

const queryContext = buildQuery([
  filter.season(20232024, 20232024),
  filter.position(PositionTypes.DEFENSE),
  filter.franchise(5),
]);
if (!isValidQuery(queryContext)) throw new Error(queryContext.errors.join('; '));

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext, reportType: 'summary', limit: 100,
});
```

Other filters: `filter.gameType(type)`, `filter.nationality('SWE')`, `filter.draft(year, round?)`,
`filter.experience(isRookie)`, `filter.homeRoad('H'|'R')`, `filter.opponent(franchiseId)`,
`filter.shootCatch('L'|'R')`, `filter.decision('W'|'L'|'O')`, `filter.status({ isActive, isHallOfFame })`.
Report types: `SKATER_REPORT_TYPES` (`summary`, `realtime`, `timeonice`, `powerplay`, ...).
An unknown report type makes the API return 500.

## Gotchas

- **The stats API pages are capped at 100 rows.** A larger `limit` is cut to
  100. Page with `start: rows.length` until you have `total` rows, or pass
  `limit: -1` to get everything (undocumented).
- `stats.*Summary` methods return just the `data` array. `skaterStatsWithQueryContext`
  returns `{ data, total }`.
- `helpers.gameIdsBySeason` returns each game twice (once per team), so dedupe
  with `new Set`. Helpers sleep between teams and take 30 to 60 seconds.
- `dailySchedule()` with no date uses **local** time. Pass a date on UTC servers.
- `games` and `numberOfGames` are **missing** on days with no games, so use `?? []`.
- No built-in retries. On `RateLimitExceededException` (429) or
  `ServerErrorException` (5xx), back off and retry. Don't `Promise.all` over
  all 32 teams.
- `buildQuery` drops invalid filters silently. Always check `isValidQuery(context)`.

## Errors

All HTTP errors extend `NHLApiException` (`statusCode`, `errorCode`):
`ResourceNotFoundException` 404, `RateLimitExceededException` 429,
`ServerErrorException` 5xx, `BadRequestException` 400 (bad `cayenneExp` or
`sort`). Bad dates or unknown seasons throw `RangeError`. Timeouts throw
`DOMException` with `name === 'TimeoutError'`.

## Testing code that uses it

Mock `globalThis.fetch`. The SDK looks it up on every request:
`mock.method(globalThis, 'fetch', async () => Response.json({...}))`.

## More

- Concepts: `docs/concepts.md`. Errors: `docs/errors.md`. Recipes: `docs/recipes/`
- Full public API surface: `api-report.md`. HTTP paths: `openapi.yaml`
- Everything in one file: `llms-full.txt`
