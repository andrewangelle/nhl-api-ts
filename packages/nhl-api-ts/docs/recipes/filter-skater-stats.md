# Filter skater stats with the query builder

Use `buildQuery` with `skaterStatsWithQueryContext` for questions like
"Swedish rookie forwards in 2023-24, by points". You don't have to write
`cayenneExp` strings by hand.

```ts
import {
  buildQuery,
  createNHLClient,
  filter,
  isValidQuery,
  PositionTypes,
} from 'nhl-api-ts';

const client = createNHLClient();

const queryContext = buildQuery([
  filter.season(20232024, 20232024),
  filter.gameType(2),
  filter.position(PositionTypes.ALL_FORWARDS),
  filter.nationality('SWE'),
  filter.experience(true),
]);

if (!isValidQuery(queryContext)) {
  throw new Error(queryContext.errors.join('; '));
}

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'summary',
  limit: 10,
});
```

`queryContext.query` is the generated `cayenneExp`:

```
seasonId >= 20232024 and seasonId <= 20232024 and gameTypeId=2 and (positionCode='L' or positionCode='R' or positionCode='C') and nationalityCode='SWE' and isRookie='1'
```

## Filters

| Filter                               | Produces                                    | Values                                      |
| ------------------------------------ | -------------------------------------------- | ------------------------------------------- |
| `filter.season(start, end)`          | `seasonId >= start and seasonId <= end`      | `YYYYYYYY`                                  |
| `filter.gameType(type)`              | `gameTypeId=type`                            | `1`, `2`, `3`                               |
| `filter.position(position)`          | `positionCode='C'` (or an OR group for `F`)  | `PositionTypes.CENTER`, `LEFT_WING`, `RIGHT_WING`, `DEFENSE`, `ALL_FORWARDS` |
| `filter.franchise(id)`               | `franchiseId=id`                             | franchise id (from `teams.franchises()`)    |
| `filter.opponent(id)`                | `opponentFranchiseId=id`                     | franchise id                                |
| `filter.nationality(code)`           | `nationalityCode='SWE'`                      | 3-letter code (from `misc.countries()`)     |
| `filter.draft(year, round?)`         | `draftYear=2015 and draftRound=1`            |                                              |
| `filter.experience(isRookie)`        | `isRookie='1'` / `'0'`                       | boolean                                     |
| `filter.homeRoad(hr)`                | `homeRoad='H'`                                | `H`, `R`                                    |
| `filter.shootCatch(lr)`              | `shootsCatches='L'`                           | `L`, `R`                                    |
| `filter.decision(d)`                 | `decision='W'`                                | `W`, `L`, `O` (validated)                   |
| `filter.status({ isActive, isHallOfFame })` | `active=1` / `isInHallOfFame=1`        | Hall of Fame wins if both are set           |

Filters are joined with `and`. Invalid filters (only `filter.decision`
validates today) are left out and reported in `queryContext.errors`. **Check
`isValidQuery(queryContext)`**, or the query silently matches more rows than
you meant.

## Report types

`reportType` picks the report: `summary`, `bios`, `faceoffpercentages`,
`faceoffwins`, `goalsForAgainst`, `realtime`, `penalties`, `penaltykill`,
`penaltyShots`, `powerplay`, `puckPossessions`, `summaryshooting`,
`percentages`, `scoringRates`, `scoringpergame`, `shootout`, `shottype`,
`timeonice`. The SDK type-checks the name against `SkaterReportRows`, which
also types the rows, and you can add a report the SDK doesn't know yet by
augmenting that interface (see [Extending response types](extending-response-types.md)).
The list is exported as `SKATER_REPORT_TYPES`. Each report has a default sort. Pass `sortExpr` to override it:

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

From the CLI, an unknown `reportType` is passed through to the API, which
answers `500` (`ServerErrorException`).

## Aggregate across seasons

With a multi-season `filter.season`, you get one row per player per season.
Pass `aggregate: true` to get one row per player:

```ts
const career = buildQuery([filter.season(20182019, 20232024)]);
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
