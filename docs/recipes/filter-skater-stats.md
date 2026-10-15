# Filter skater stats with the query builder

Use `QueryBuilder` with `skaterStatsWithQueryContext` for questions like
"Swedish rookie forwards in 2023-24, by points". You don't have to write
`cayenneExp` strings by hand.

```ts
import {
  ExperienceQuery,
  GameTypeQuery,
  NationalityQuery,
  NHLClient,
  PositionQuery,
  PositionTypes,
  QueryBuilder,
  SeasonQuery,
} from 'nhl-api-ts';

const client = new NHLClient();

const queryContext = new QueryBuilder().build([
  new SeasonQuery(20232024, 20232024),
  new GameTypeQuery(2),
  new PositionQuery(PositionTypes.ALL_FORWARDS),
  new NationalityQuery('SWE'),
  new ExperienceQuery(true),
]);

if (!queryContext.isValid()) {
  throw new Error(queryContext.errors.join('; '));
}

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'summary',
  limit: 10,
});
```

`queryContext.queryStr` is the generated `cayenneExp`:

```
seasonId >= 20232024 and seasonId <= 20232024 and gameTypeId=2 and (positionCode='L' or positionCode='R' or positionCode='C') and nationalityCode='SWE' and isRookie='1'
```

## Filters

| Filter                                    | Produces                                  | Values                                      |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| `new SeasonQuery(start, end)`             | `seasonId >= start and seasonId <= end`   | `YYYYYYYY`                                  |
| `new GameTypeQuery(type)`                 | `gameTypeId=type`                         | `1`, `2`, `3`                               |
| `new PositionQuery(position)`             | `positionCode='C'` (or an OR group for `F`) | `PositionTypes.CENTER`, `LEFT_WING`, `RIGHT_WING`, `DEFENSE`, `ALL_FORWARDS` |
| `new FranchiseQuery(id)`                  | `franchiseId=id`                          | franchise id (from `teams.franchises()`)    |
| `new OpponentQuery(id)`                   | `opponentFranchiseId=id`                  | franchise id                                |
| `new NationalityQuery(code)`              | `nationalityCode='SWE'`                   | 3-letter code (from `misc.countries()`)     |
| `new DraftQuery(year, round?)`            | `draftYear=2015 and draftRound=1`         |                                             |
| `new ExperienceQuery(isRookie)`           | `isRookie='1'` / `'0'`                    | boolean                                     |
| `new HomeRoadQuery(hr)`                   | `homeRoad='H'`                            | `H`, `R`                                    |
| `new ShootCatchesQuery(lr)`               | `shootsCatches='L'`                       | `L`, `R`                                    |
| `new DecisionQuery(d)`                    | `decision='W'`                            | `W`, `L`, `O` (validated)                   |
| `new StatusQuery({ isActive, isHallOfFame })` | `active=1` / `isInHallOfFame=1`       | Hall of Fame wins if both are set           |

Filters are joined with `and`. Invalid filters (only `DecisionQuery` validates
today) are left out and reported in `queryContext.errors`. **Check
`isValid()`**, or the query silently matches more rows than you meant.

## Report types

`reportType` picks the report: `summary`, `bios`, `faceoffpercentages`,
`faceoffwins`, `goalsForAgainst`, `realtime`, `penalties`, `penaltykill`,
`penaltyShots`, `powerplay`, `puckPossessions`, `summaryshooting`,
`percentages`, `scoringRates`, `scoringpergame`, `shootout`, `shottype`,
`timeonice`. The list is exported as `SKATER_REPORT_TYPES`. Each report has a
default sort. Pass `sortExpr` to override it:

```ts
await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'realtime',
  sortExpr: [
    { property: 'hits', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
});
```

An unknown `reportType` makes the API answer `500` (`ServerErrorException`).

## Aggregate across seasons

With a multi-season `SeasonQuery`, you get one row per player per season. Pass
`aggregate: true` to get one row per player:

```ts
const career = new QueryBuilder().build([new SeasonQuery(20182019, 20232024)]);
await client.stats.skaterStatsWithQueryContext({
  queryContext: career,
  reportType: 'summary',
  aggregate: true,
});
```

## From the CLI

```bash
nhl-api-ts stats skater-stats-with-query-context summary \
  --season-start 20232024 --game-type 2 --position F --nationality SWE --rookie --limit 10
```

Goalies don't have a query-builder method. Use `goalieStatsSummary` with
`franchiseId` or `defaultCayenneExp`.

Runnable version: [`examples/query-builder.mts`](../../examples/query-builder.mts).
