# nhl-api-ts

TypeScript SDK **and** command line tool for the NHL API and NHL EDGE stats.

Every SDK method is also available as a CLI command.

- Zero runtime dependencies (uses the built-in `fetch`)
- Node.js >= 24, ESM only
- Fully typed: every response has a named interface you can [extend](docs/recipes/extending-response-types.md)

## Documentation

- [Concepts](docs/concepts.md): ID formats, the two NHL APIs, "now" redirects, pagination, retries
- [Errors](docs/errors.md): every error, its cause and the fix
- [Recipes](docs/recipes/): [filtered stats](docs/recipes/filter-skater-stats.md),
  [pagination](docs/recipes/paginate-stats.md), [live scores](docs/recipes/live-scores.md),
  [season-wide data](docs/recipes/season-wide-data.md), [retries](docs/recipes/retries.md),
  [CLI + jq](docs/recipes/cli-and-jq.md), [testing](docs/recipes/testing.md),
  [extending response types](docs/recipes/extending-response-types.md)
- [Examples](examples/): runnable scripts
- [API report](api-report.md): the full public TypeScript API
- [OpenAPI](openapi.yaml): every HTTP path the SDK calls
- [Migration guide](MIGRATION.md): breaking changes between versions
- For LLMs and agents: [llms.txt](llms.txt), [llms-full.txt](llms-full.txt),
  [Agent Skill](skills/nhl-api-ts/SKILL.md)

## Installation

```bash
pnpm add nhl-api-ts      # SDK
pnpm add -g nhl-api-ts   # CLI (`nhl-api-ts` on your PATH)
# or run the CLI without installing:
npx nhl-api-ts --help
```

## SDK quick start

```ts
import { createNHLClient } from 'nhl-api-ts';

const client = createNHLClient();

const teams = await client.teams.teams();
const standings = await client.standings.leagueStandings();
const games = await client.schedule.dailySchedule();
```

Every method is `async` and takes a single options object:

```ts
await client.gameCenter.boxscore({ gameId: '2023020280' });
await client.edge.skaterDetail({ playerId: 8478402, season: 20232024 });
await client.stats.teamSummary({ startSeason: 20202021, endSeason: 20232024 });
```

IDs and seasons accept either strings or numbers.

## Configuration

```ts
const client = createNHLClient({
  debug: true,           // log each request URL to stderr (default false)
  timeout: 30,           // seconds (default 10)
  followRedirects: true, // "/now" endpoints redirect to today's data (default true)
});
```

## API modules

All methods below live on `client.<module>`. Parameters in `[brackets]` are
optional.

### teams

- `teams({ [date] })` — all teams with conference, division and `franchise_id`
- `teamRoster({ teamAbbr, [season] })` — no `season` → current roster
- `rosterSeasons({ teamAbbr })` — every season the team has a roster for
- `teamScoreboard({ teamAbbr })` — recent and upcoming games
- `franchises()`

### standings

- `leagueStandings({ [date], [season] })` — `season` uses that season's final standings
- `seasonStandingManifest()`

### schedule

- `dailySchedule({ [date] })` — date is validated/normalized (`2024-10-9` → `2024-10-09`)
- `weeklySchedule({ [date] })`
- `teamMonthlySchedule({ teamAbbr, [month] })`
- `teamWeeklySchedule({ teamAbbr, [date] })`
- `teamSeasonSchedule({ teamAbbr, [season] })`
- `calendarSchedule({ [date] })`
- `playoffCarousel({ season })`
- `playoffSeriesSchedule({ season, series })`
- `playoffSeriesMeta({ year, series })` — round title and the two seeded teams
- `playoffBracket({ year })`

### gameCenter

- `boxscore({ gameId })`
- `playByPlay({ gameId })`
- `matchUp({ gameId })`
- `dailyScores({ [date] })`
- `shiftChartData({ gameId, [excludes] })`
- `seasonSeriesMatchup({ gameId })`
- `gameStory({ gameId })`
- `scoreboard({ [date] })` — every game in the week around a date, grouped by date
- `wscPlayByPlay({ gameId })` — flat play array (a different shape from `playByPlay`)
- `playReplay({ gameId, eventNumber })` — replay card for one event; `goal` only for goals (experimental)
- `gameMeta({ gameId })` — teams, season state and game state

### stats

- `gametypesPerSeasonDirectoryByTeam({ teamAbbr })`
- `playerCareerStats({ playerId })`
- `playerGameLog({ playerId, [seasonId], [gameType] })`
- `skaterStatsLeaders({ [season], [gameType], [categories], [limit] })` — leaders keyed by category (`goals`, `points`, `toi`, ...); `limit: -1` returns every player
- `goalieStatsLeaders({ [season], [gameType], [categories], [limit] })` — `wins`, `shutouts`, `savePctg`, `goalsAgainstAverage`
- `clubStats({ teamAbbr, [season], [gameType] })` — a team's skater and goalie stats
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
- Team comparison (`{ teamId }`): `teamComparison`
- League highlights: `byTheNumbers({ [season], [gameType] })`. Without `season`
  it covers the latest game night; with one, the season bests
- Leaderboards (top 10, no id). Each returns a bare array of 10 rows that carry
  every metric of that leaderboard; `sortBy` (required) only picks the order.
  `positions` (`'all'`, `'forwards'`, `'defense'`; see `EdgePositions`),
  `strength` (`'all'`, `'es'`, `'pp'`, `'pk'`; see `EdgeStrengths`) and the
  shot-location `category` (`'all'`, `'high'`, `'mid'`, `'long'`) default to
  `'all'`:
  - Skaters: `skaterDistanceTop10({ [positions], [strength], sortBy })`,
    `skaterSpeedTop10({ [positions], sortBy })`,
    `skaterZoneTimeTop10({ [positions], [strength], sortBy })`,
    `skaterShotSpeedTop10({ [positions], sortBy })`,
    `skaterShotLocationTop10({ [positions], sortBy, [category] })`
  - Goalies: `goalie5v5Top10({ sortBy })`,
    `goalieShotLocationTop10({ sortBy, [category] })`,
    `goalieSavePercentageTop10({ sortBy })`
  - Teams: `teamSkatingDistanceTop10({ [positions], [strength], sortBy })`,
    `teamSkatingSpeedTop10({ [positions], sortBy })`,
    `teamZoneTimeTop10({ [strength], sortBy })`,
    `teamShotSpeedTop10({ [positions], sortBy })`,
    `teamShotLocationTop10({ [positions], sortBy, [category] })`
  - Zone-time `sortBy` is the zone (`EdgeZones`: `'offensive'`, `'neutral'`,
    `'defensive'`); the other `sortBy` values are typed per method (e.g.
    `EdgeSkatingDistanceSortBy`: `'total'`, `'per-60'`, `'max-game'`,
    `'max-period'`)

### players

- `prospectsByTeam({ teamAbbr })`
- `playersByTeam({ teamAbbr, [season] })`
- `playerSpotlight()`

### draft

Draft years are **YYYY** (`2023`), not `YYYYYYYY`. Without `season` the
current draft (`/now`) is used.

- `rankings({ [season], [category] })` — Central Scouting rankings.
  `category` is a `ProspectCategory` (1 NA skater, the default; 2 Intl skater;
  3 NA goalie; 4 Intl goalie)
- `tracker()` — the live draft tracker for the current draft
- `picks({ [season], [round] })` — picks for round `1`-`7` or `'all'` (the
  default). `picks()` without a season returns round **1** of the current
  draft, since the API redirects `draft/picks/now` there

Rounds per draft year live in `misc.draftYearAndRounds()`.

### misc

- `glossary()`, `config()`, `countries()`, `seasonSpecificRulesAndInfo()`,
  `draftYearAndRounds()`
- `seasonIds()` — every season id (`19171918` ... current)
- `tvSchedule({ [date] })` — national TV broadcasts for the week around a date
- `meta({ [players], [teams] })` — display metadata (names, slugs, headshots) for player ids and team abbreviations
- `partnerGameOdds({ countryCode })` — today's betting odds (experimental)
- `location()` — the caller's country from their IP (experimental)
- `postalLookup({ postalCode })` — teams whose broadcast market covers a postal code (experimental)

### helpers

These make one or more requests per team and sleep `apiSleepRate` seconds
between teams to avoid rate limiting.

- `gameIdsBySeason({ season, [gameTypes], [apiSleepRate] })`
- `allPlayers({ season, [apiSleepRate] })`
- `allPlayersSummaryStatistics({ season, [apiSleepRate] })`

## Query builder

```ts
import { createNHLClient, buildQuery, isValidQuery, filter, PositionTypes } from 'nhl-api-ts';

const client = createNHLClient();

const context = buildQuery([
  filter.gameType('2'),
  filter.season('20232024', '20232024'),
  filter.position(PositionTypes.ALL_FORWARDS),
  filter.draft('2015', '1'),
]);

if (!isValidQuery(context)) console.error(context.errors);

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext: context,
  reportType: 'summary',
  aggregate: true,
});
```

Available filters: `filter.decision`, `filter.draft`, `filter.experience`,
`filter.franchise`, `filter.gameType`, `filter.homeRoad`,
`filter.nationality`, `filter.opponent`, `filter.position`, `filter.season`,
`filter.shootCatch`, `filter.status`.

Skater report types: `summary`, `bios`, `faceoffpercentages`, `faceoffwins`,
`goalsForAgainst`, `realtime`, `penalties`, `penaltykill`, `penaltyShots`,
`powerplay`, `puckPossessions`, `summaryshooting`, `percentages`,
`scoringRates`, `scoringpergame`, `shootout`, `shottype`, `timeonice`.

## Extending the types

Response types come from real API responses, and the NHL adds fields without
notice. Every object type is an `interface`, so you can add what's missing with
module augmentation:

```ts
declare module 'nhl-api-ts' {
  interface Boxscore {
    someNewField?: string;
  }
}
```

New play types and report types are added through registries (`PlayTypes`,
`SkaterReportRows`, `GoalieReportRows`). See
[Extending response types](docs/recipes/extending-response-types.md) for those
and for the one-off cast.

## Errors

HTTP failures throw exceptions that all extend `NHLApiException`, which has
`statusCode` and `errorCode`:

| Status | Exception                    |
| ------ | ---------------------------- |
| 400    | `BadRequestException`        |
| 401    | `UnauthorizedException`      |
| 404    | `ResourceNotFoundException`  |
| 429    | `RateLimitExceededException` |
| 5xx    | `ServerErrorException`       |
| other  | `NHLApiException`            |

Invalid input (bad dates, unknown seasons) throws a `RangeError`.

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
| `--no-follow-redirects` | Do not follow HTTP redirects      |
| `-v`, `--version`       | Print the version                 |

Exit codes: `0` success, `1` API or network error, `2` invalid usage.
Progress and warning messages from `helpers` go to stderr, so stdout is always
clean JSON.

Pipe output to `jq` to slice it:

```bash
nhl-api-ts teams teams --compact | jq -r '.[].abbr'
```

## Development

This package lives in a pnpm workspace. Run these from the
[repository root](https://github.com/andrewangelle/nhl-api-ts):

```bash
pnpm install
pnpm test         # node:test, runs the TypeScript sources directly
pnpm typecheck
pnpm lint:check
pnpm build        # emits packages/nhl-api-ts/dist/
```

See [CONTRIBUTING.md](https://github.com/andrewangelle/nhl-api-ts/blob/main/CONTRIBUTING.md)
for the full set of checks, and
[AGENTS.md](https://github.com/andrewangelle/nhl-api-ts/blob/main/AGENTS.md) for
repository conventions.

Try the CLI from source:

```bash
node --conditions=source packages/nhl-api-ts/src/cli.mts --help
```

## Credits

Ported from [nhl-api-py](https://github.com/coreyjs/nhl-api-py).

## License

[MIT](LICENSE)
