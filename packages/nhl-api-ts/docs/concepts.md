# Concepts

This page covers how `nhl-api-ts` is put together and how the NHL API behaves
underneath it. Read it once before you write anything non-trivial.

## One client, nine modules

```ts
import { createNHLClient } from 'nhl-api-ts';

const client = createNHLClient({ timeout: 30 });
```

`createNHLClient` builds a client holding the resolved config and one `get`
function. It exposes nine modules. Each module is a group of bound endpoint
functions:

| Module              | What it covers                                                     |
| ------------------- | ------------------------------------------------------------------ |
| `client.teams`      | Team list (with conference, division, franchise id), rosters, franchises |
| `client.standings`  | League standings by date or season, season manifest                |
| `client.schedule`   | Daily, weekly, team, calendar and playoff schedules                |
| `client.gameCenter` | Boxscore, play-by-play, landing, scores, shift charts, game story  |
| `client.stats`      | Player career and game logs, team, skater and goalie stat reports  |
| `client.edge`       | NHL EDGE puck and player tracking (speed, distance, zone time, ...) |
| `client.players`    | Prospects and rosters by team                                      |
| `client.misc`       | Glossary, stats config, countries, seasons, draft rounds           |
| `client.helpers`    | Multi-request conveniences: every game id, every player, bulk stats |

The client has no state between calls: there are no caches, sessions or
cookies. Create one and reuse it, or create one per request. Both are cheap.

## Calling convention

Every endpoint method:

- is `async`,
- takes **a single options object** (or nothing), with camelCase keys,
- returns the parsed JSON body, typed with a named interface (see
  [Response types](#response-types)).

```ts
await client.gameCenter.boxscore({ gameId: 2023020280 });
await client.schedule.dailySchedule(); // all params optional
```

Responses pass through as the API returned them, with no renaming. Only two
shapes are built by the SDK:

- `Team` from `teams.teams()`: `{ conference, division, name, common_name, abbr, logo, franchise_id? }`
- `DailySchedule` from `schedule.dailySchedule()`: `{ date, nextStartDate, previousStartDate, oddsPartners, games?, numberOfGames? }`

Some methods unwrap an envelope for you: `franchises()` returns `data`,
`teamMonthlySchedule()` returns `games`, `playerGameLog()` returns `gameLog`.
The JSDoc on each method says what you get back.

## Response types

Every method returns a named, exported interface (`Boxscore`, `PlayByPlay`,
`RosterPlayer`, `SkaterReportRows['summary']`, ...). The NHL does not publish
a schema, so the types are derived from real responses (see
`pnpm api-types:fetch`, `api-types:infer` and `api-types:check` in
[CONTRIBUTING.md](../../../CONTRIBUTING.md)). Nothing is validated at runtime: a
type describes what the API returned when the SDK was released.

- **Optional fields** (`field?: T`) are absent in some responses. When the
  rule is known, the JSDoc says when, for example `Absent before the game is
  played`, `Goalies only` or ``Absent when `aggregate: true` ``. A field with
  no note can be missing for reasons the samples didn't reveal.
- **Nullable fields** (`field: T | null`) are present with a `null` value.
- **Open enums.** Values such as `gameState`, `periodType` and `positionCode`
  are typed as `OpenUnion<'REG' | 'OT' | 'SO'>`: autocomplete lists the known
  values, and a new value from the NHL still compiles.
- **Tagged unions.** Play-by-play events are a union keyed by `typeDescKey`,
  so `if (play.typeDescKey === 'goal')` narrows `play.details` to goal details.
- **Report rows.** `skaterStatsWithQueryContext({ reportType: 'bios' })` and
  `goalieStatsSummary({ statsType: 'advanced' })` return rows typed for that
  report.

To add a field the SDK doesn't know about, or a new event or report type,
augment the interface. See [Extending response types](recipes/extending-response-types.md).

## Identifier formats

| Thing        | Format        | Example      | Notes                                                    |
| ------------ | ------------- | ------------ | -------------------------------------------------------- |
| Season       | `YYYYYYYY`    | `20232024`   | Start and end year, concatenated                         |
| Draft year   | `YYYY`        | `2023`       | `draft.*` only. 8-digit seasons are a 404 there          |
| Game id      | `YYYYTTNNNN`  | `2023020280` | Season start year, game type (`01`/`02`/`03`), game number |
| Game type    | integer       | `2`          | `1` preseason, `2` regular season, `3` playoffs          |
| Date         | `YYYY-MM-DD`  | `2024-10-09` | `dailySchedule` also accepts `2024-10-9`                 |
| Month        | `YYYY-MM`     | `2023-11`    | `teamMonthlySchedule`                                    |
| Team abbr    | 3 letters     | `TOR`        | Used by web API endpoints                                |
| Team id      | integer       | `10`         | Used by EDGE team endpoints                              |
| Franchise id | integer       | `5`          | Used by stats API filters. **Not** the same as team id   |
| Player id    | integer       | `8478402`    |                                                          |

IDs and seasons are typed `Id = string | number`, so `20232024` and
`'20232024'` both work.

Many name fields in responses are localized objects:
`{ "default": "Auston", "fr": "..." }`. Read `.default`.

## Two APIs, three base URLs

The SDK talks to two NHL services. `Endpoint` in `http-client.mts` names them:

| `Endpoint`   | Base URL                            | Used by                                     |
| ------------ | ----------------------------------- | ------------------------------------------- |
| `API_WEB_V1` | `https://api-web.nhle.com/v1/`      | teams, standings, schedule, game center, EDGE, players, player stats, draft |
| `API_STATS`  | `https://api.nhle.com/stats/rest/`  | franchises, shift charts, team/skater/goalie reports |
| `API_CORE`   | `https://api.nhle.com/`             | misc (glossary, config, countries, ...)     |

The **web API** is resource-shaped (`/gamecenter/{id}/boxscore`).
The **stats API** is report-shaped (`/en/skater/summary?cayenneExp=...`). It
supports filtering, sorting and pagination. See below.

[`openapi.yaml`](../openapi.yaml) describes every HTTP path the SDK calls.

## "now" and redirects

Many web API endpoints accept the literal segment `now` in place of a date or
season. The API answers with a `307` redirect to the dated resource:

```
GET /v1/standings/now                       -> 307 /v1/standings/2026-10-14
GET /v1/edge/skater-detail/8478402/now      -> 307 /v1/edge/skater-detail/8478402/20262027/2
```

When you omit `date`, `season` or `month`, the SDK sends `now`. A few
endpoints 404 on `now` and take `current` instead; for those the SDK sends
`current`: `teams.teamRoster`, `players.playersByTeam`,
`stats.skaterStatsLeaders` and `stats.goalieStatsLeaders`. When `season` is
omitted, a `gameType` you pass is ignored (the redirect picks the regular
season). The client
follows redirects by default (`followRedirects: true`). If you turn that off,
every `now` call fails with `NHLApiException` (status 307). See
[errors.md](errors.md#nhlapiexception-3xx).

`schedule.dailySchedule()` is the exception. It computes today's date in
**local time** and requests that date directly.

## Authentication

None. Both APIs are public and unauthenticated. The SDK sends no API keys and
reads no environment variables. `UnauthorizedException` (401) exists only so
that every status code maps to an error class.

## Configuration

```ts
createNHLClient({
  debug: false,         // log "GET: <url>" to stderr for each request
  timeout: 10,          // seconds, per request (AbortSignal.timeout)
  followRedirects: true // follow the 307s from "now" endpoints
});
```

The CLI exposes these options as `--debug`, `--timeout <seconds>` and
`--no-follow-redirects`.

## Pagination (stats API only)

The stats report endpoints take `start` (offset, default `0`) and `limit` (page
size: default `25`, or `50` for `teamSummary`). They are passed straight
through as query parameters. The API caps a page at **100 rows**, whatever
`limit` you send. `limit: -1` returns every row.

- `skaterStatsWithQueryContext` returns the full envelope `{ data, total }`, so
  you can page until you have `total` rows.
- `teamSummary`, `skaterStatsSummary` and `goalieStatsSummary` return only
  `data` (an array). Use `limit <= 100` and page until a page comes back
  shorter than `limit`.

The web API is not paginated. See
[recipes/paginate-stats.md](recipes/paginate-stats.md).

## Filtering and sorting (stats API)

The stats API filters with a `cayenneExp` expression
(`seasonId>=20232024 and positionCode='C'`) and sorts with a JSON `sort` array.

- The `*Summary` methods build `cayenneExp` from `startSeason`, `endSeason`,
  `gameTypeId` and `franchiseId`. You can replace it entirely with
  `defaultCayenneExp`.
- `skaterStatsWithQueryContext` takes a `QueryContext` built from `Filter`
  values by `buildQuery`. See
  [recipes/filter-skater-stats.md](recipes/filter-skater-stats.md).
- `sortExpr` is `SortExpr[]` (`{ property, direction }`). Each report type has
  a default sort, from `defaultSortForReport` and `goalieStatsSorts`.

## Retries and rate limits

The SDK does **not** retry. A failed request throws once. The NHL does not
document rate limits, but bursts of requests can get a `429`
(`RateLimitExceededException`) or a `5xx`. If you need retries, wrap calls
yourself. See [recipes/retries.md](recipes/retries.md).

`client.helpers` methods make one or more requests per team (30+ teams). They
sleep `apiSleepRate` seconds between teams (default 0.5 to 1 s), so a single
call can take 30 to 60 seconds. They log progress to stderr.

## Errors

HTTP errors become typed exceptions. Bad input becomes `RangeError`. Timeouts
and network failures propagate from `fetch`. The full list is in
[errors.md](errors.md).

## CLI

Every SDK method is also a CLI command:
`nhl-api-ts <module> <command> [args] [options]`. Module and command names are
the kebab-case SDK names (`gameCenter.playByPlay` becomes
`game-center play-by-play`). Output is JSON on stdout. Exit codes: `0` ok,
`1` API or network error, `2` usage error. See
[recipes/cli-and-jq.md](recipes/cli-and-jq.md).
