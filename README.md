# nhl-api-ts

TypeScript SDK **and** command line tool for the NHL API and NHL EDGE stats.

This is a port of [nhl-api-py](https://github.com/coreyjs/nhl-api-py). It calls
the same endpoints, sends the same query parameters, and returns the same
payloads. Every SDK method is also available as a CLI command.

- Zero runtime dependencies (uses the built-in `fetch`)
- Node.js >= 24, ESM only
- Fully typed

## Installation

```bash
pnpm add nhl-api-ts      # SDK
pnpm add -g nhl-api-ts   # CLI (`nhl-api-ts` on your PATH)
# or run the CLI without installing:
npx nhl-api-ts --help
```

## SDK quick start

```ts
import { NHLClient } from 'nhl-api-ts';

const client = new NHLClient();

const teams = await client.teams.teams();
const standings = await client.standings.leagueStandings();
const games = await client.schedule.dailySchedule();
```

Every method is `async` and takes a single options object. The keys are the
camelCase versions of the nhl-api-py keyword arguments:

| Python                                                      | TypeScript                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `client.game_center.boxscore(game_id="2023020280")`         | `await client.gameCenter.boxscore({ gameId: '2023020280' })`      |
| `client.edge.skater_detail(player_id=8478402, season=20232024)` | `await client.edge.skaterDetail({ playerId: 8478402, season: 20232024 })` |
| `client.stats.team_summary(start_season=..., end_season=...)` | `await client.stats.teamSummary({ startSeason, endSeason })`     |

IDs and seasons accept either strings or numbers.

## Configuration

```ts
const client = new NHLClient({
  debug: true,           // log each request URL to stderr (default false)
  timeout: 30,           // seconds (default 10)
  sslVerify: false,      // skip TLS certificate verification (default true)
  followRedirects: true, // "/now" endpoints redirect to today's data (default true)
});
```

## API modules

All methods below live on `client.<module>`. Parameters in `[brackets]` are
optional.

### teams

- `teams({ [date] })` — all teams with conference, division and `franchise_id`
- `teamRoster({ teamAbbr, season })`
- `franchises()`

### standings

- `leagueStandings({ [date], [season] })` — `season` uses that season's final standings
- `seasonStandingManifest()`

### schedule

- `dailySchedule({ [date] })` — date is validated/normalized (`2024-10-9` → `2024-10-09`)
- `weeklySchedule({ [date] })`
- `teamMonthlySchedule({ teamAbbr, [month] })`
- `teamWeeklySchedule({ teamAbbr, [date] })`
- `teamSeasonSchedule({ teamAbbr, season })`
- `calendarSchedule({ date })`
- `playoffCarousel({ season })`
- `playoffSeriesSchedule({ season, series })`
- `playoffBracket({ year })`

### gameCenter

- `boxscore({ gameId })`
- `playByPlay({ gameId })`
- `matchUp({ gameId })`
- `dailyScores({ [date] })`
- `shiftChartData({ gameId, [excludes] })`
- `seasonSeriesMatchup({ gameId })`
- `gameStory({ gameId })`

### stats

- `gametypesPerSeasonDirectoryByTeam({ teamAbbr })`
- `playerCareerStats({ playerId })`
- `playerGameLog({ playerId, seasonId, gameType })`
- `teamSummary({ startSeason, endSeason, [gameTypeId], [isGame], [isAggregate], [sortExpr], [start], [limit], [factCayenneExp], [defaultCayenneExp] })`
- `skaterStatsSummary({ startSeason, endSeason, [franchiseId], [gameTypeId], [aggregate], [sortExpr], [start], [limit], [factCayenneExp], [defaultCayenneExp] })`
- `skaterStatsWithQueryContext({ queryContext, reportType, [sortExpr], [aggregate], [start], [limit] })`
- `goalieStatsSummary({ startSeason, [endSeason], [statsType], [gameTypeId], [franchiseId], [aggregate], [sortExpr], [start], [limit], [factCayenneExp], [defaultCayenneExp] })`

### edge

Every EDGE method takes `[season]` and `[gameType]` (2 = regular season, the
default; 3 = playoffs). Without `season` the current season (`/now`) is used.

- Skaters (`{ playerId }`): `skaterDetail`, `skaterShotSpeedDetail`,
  `skaterSkatingSpeedDetail`, `skaterShotLocationDetail`,
  `skaterSkatingDistanceDetail`, `skaterComparison`, `skaterZoneTime`,
  `catSkaterDetail`
- Goalies (`{ playerId }`): `goalieDetail`, `goalieShotLocationDetail`,
  `goalie5v5Detail`, `goalieComparison`, `goalieSavePercentageDetail`,
  `catGoalieDetail`
- Teams (`{ teamId }`): `teamDetail`, `teamSkatingDistanceDetail`,
  `teamZoneTimeDetails`, `teamShotLocationDetail`, `teamShotSpeedDetail`,
  `teamSkatingSpeedDetail`
- Landing pages (no id): `skaterLanding`, `goalieLanding`, `teamLanding`

### players

- `prospectsByTeam({ teamAbbr })`
- `playersByTeam({ teamAbbr, season })`

### misc

- `glossary()`, `config()`, `countries()`, `seasonSpecificRulesAndInfo()`,
  `draftYearAndRounds()`

### helpers

These make one or more requests per team and sleep `apiSleepRate` seconds
between teams to avoid rate limiting.

- `gameIdsBySeason({ season, [gameTypes], [apiSleepRate] })`
- `allPlayers({ season, [apiSleepRate] })`
- `allPlayersSummaryStatistics({ season, [apiSleepRate] })`

## Query builder

```ts
import {
  NHLClient,
  QueryBuilder,
  SeasonQuery,
  GameTypeQuery,
  PositionQuery,
  PositionTypes,
  DraftQuery,
} from 'nhl-api-ts';

const client = new NHLClient();

const context = new QueryBuilder().build([
  new GameTypeQuery('2'),
  new SeasonQuery('20232024', '20232024'),
  new PositionQuery(PositionTypes.ALL_FORWARDS),
  new DraftQuery('2015', '1'),
]);

if (!context.isValid()) console.error(context.errors);

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext: context,
  reportType: 'summary',
  aggregate: true,
});
```

Available filters: `DecisionQuery`, `DraftQuery`, `ExperienceQuery`,
`FranchiseQuery`, `GameTypeQuery`, `HomeRoadQuery`, `NationalityQuery`,
`OpponentQuery`, `PositionQuery`, `SeasonQuery`, `ShootCatchesQuery`,
`StatusQuery`.

Skater report types: `summary`, `bios`, `faceoffpercentages`, `faceoffwins`,
`goalsForAgainst`, `realtime`, `penalties`, `penaltykill`, `penaltyShots`,
`powerplay`, `puckPossessions`, `summaryshooting`, `percentages`,
`scoringRates`, `scoringpergame`, `shootout`, `shottype`, `timeonice`.

## Errors

HTTP failures throw the same exception classes as nhl-api-py. They all extend
`NHLApiException`, which has `statusCode` and `errorCode`:

| Status | Exception                    |
| ------ | ---------------------------- |
| 400    | `BadRequestException`        |
| 401    | `UnauthorizedException`      |
| 404    | `ResourceNotFoundException`  |
| 429    | `RateLimitExceededException` |
| 5xx    | `ServerErrorException`       |
| other  | `NHLApiException`            |

Invalid input where nhl-api-py raises `ValueError` (bad dates, unknown
seasons) throws a `RangeError`.

```ts
import { ResourceNotFoundException } from 'nhl-api-ts';

try {
  await client.gameCenter.boxscore({ gameId: 1 });
} catch (err) {
  if (err instanceof ResourceNotFoundException) console.log(err.statusCode); // 404
}
```

## CLI

```
nhl-api-ts <module> <command> [args] [options]
```

Modules and commands are the kebab-case names of the SDK modules and methods,
and options are the kebab-case parameter names. Required parameters can be
passed positionally, in order, or as flags. Results are printed to stdout as
JSON.

```bash
nhl-api-ts --help                      # list modules
nhl-api-ts edge --help                 # list a module's commands
nhl-api-ts stats team-summary --help   # a command's arguments and options

nhl-api-ts teams teams
nhl-api-ts schedule daily-schedule --date 2024-10-09
nhl-api-ts game-center boxscore 2023020280
nhl-api-ts game-center shift-chart-data 2023020280 --excludes eventDetails,playerStats
nhl-api-ts standings league-standings --season 20222023
nhl-api-ts edge skater-detail 8478402 --season 20232024 --game-type 3
nhl-api-ts stats team-summary 20202021 20232024 --game-type-id 3 --limit 5
nhl-api-ts stats goalie-stats-summary 20232024 --stats-type advanced
nhl-api-ts helpers game-ids-by-season 20232024 --game-types 2,3
```

The query builder is available through filter flags on
`stats skater-stats-with-query-context`:

```bash
nhl-api-ts stats skater-stats-with-query-context summary \
  --season-start 20232024 --position F --nationality SWE --rookie --limit 10
```

Filter flags: `--season-start`, `--season-end`, `--franchise-id`,
`--game-type`, `--position` (F/C/L/R/D), `--nationality`, `--decision`
(W/L/O), `--draft-year`, `--draft-round`, `--rookie` / `--no-rookie`,
`--home-road` (H/R), `--opponent-franchise-id`, `--shoot-catch` (L/R),
`--active`, `--hall-of-fame`.

Global options:

| Option                  | Description                       |
| ----------------------- | --------------------------------- |
| `--compact`             | Print JSON on a single line       |
| `--debug`               | Log request URLs to stderr        |
| `--timeout <seconds>`   | Request timeout (default 10)      |
| `--no-ssl-verify`       | Skip TLS certificate verification |
| `--no-follow-redirects` | Do not follow HTTP redirects      |
| `-v`, `--version`       | Print the version                 |

Exit codes: `0` success, `1` API or network error, `2` invalid usage.

Pipe output to `jq` to slice it:

```bash
nhl-api-ts teams teams --compact | jq -r '.[].abbr'
```

## Differences from nhl-api-py

- Methods are async, camelCase, and take one options object.
- Response payloads are not renamed. Fields the SDK builds itself also keep the
  Python key names (`common_name` and `franchise_id` in `teams.teams()`).
- `DecisionQuery.validate()` returns `true` for valid values. In nhl-api-py it
  returns `None`, so `QueryBuilder` rejects every decision filter, including
  valid ones. The port fixes this.
- Progress and warning messages from `helpers` go to stderr, so CLI stdout is
  always clean JSON.

## Development

```bash
pnpm install
pnpm test         # node:test, runs the TypeScript sources directly
pnpm typecheck
pnpm lint:check
pnpm build        # emits dist/
```

Try the CLI from source:

```bash
node --conditions=source src/cli.mts --help
```
