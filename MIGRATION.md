# Migration guide

Guides for moving between versions of `nhl-api-ts`, and from the Python
library it was ported from. Newest first.

- [Unreleased: functional API (planned)](#unreleased-functional-api-planned)
- [nhl-api-py → nhl-api-ts 0.1](#nhl-api-py--nhl-api-ts-01)

---

## Unreleased: functional API (planned)

Not released. A refactor from classes to plain functions is planned in
[`.claude/plans/functional-refactor.md`](.claude/plans/functional-refactor.md).
When it lands, its before/after guide goes here. The planned changes:

| 0.1                                           | Planned                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `new NHLClient(options)`                      | `createNHLClient(options)`                      |
| `new QueryBuilder().build([...])`             | `buildQuery([...])`                             |
| `new SeasonQuery(a, b)`, `new PositionQuery(p)`, ... | `filter.season(a, b)`, `filter.position(p)`, ... |
| `context.isValid()`                           | `isValidQuery(context)`                         |
| `context.queryStr`                            | `context.query`                                 |
| `SortingOptions.getDefaultSortingForReport(r)`| `defaultSortForReport(r)`                       |
| `InvalidQueryValueException`                  | removed (validation errors stay in `context.errors`) |
| `HttpClient`, `ClientConfig`                  | `createGet`, `resolveConfig`                    |

`client.<module>.<method>(...)` calls are planned to stay the same.

---

## nhl-api-py → nhl-api-ts 0.1

`nhl-api-ts` calls the same endpoints as
[nhl-api-py](https://github.com/coreyjs/nhl-api-py) and returns the same
payloads. The changes are in the calling convention.

### Install and import

```diff
- pip install nhl-api-py
+ pnpm add nhl-api-ts         # Node.js >= 24, ESM only
```

```diff
- from nhlpy import NHLClient
- client = NHLClient()
+ import { NHLClient } from 'nhl-api-ts';
+ const client = new NHLClient();
```

### Calls are async, camelCase, and take one object

Module and method names go from snake_case to camelCase. Keyword arguments
become keys of a single options object. Every call returns a promise.

```diff
- client.game_center.boxscore(game_id="2023020280")
+ await client.gameCenter.boxscore({ gameId: '2023020280' })

- client.edge.skater_detail(player_id=8478402, season=20232024, game_type=3)
+ await client.edge.skaterDetail({ playerId: 8478402, season: 20232024, gameType: 3 })

- client.stats.team_summary(start_season="20202021", end_season="20232024", is_aggregate=True)
+ await client.stats.teamSummary({ startSeason: 20202021, endSeason: 20232024, isAggregate: true })

- client.helpers.all_players(season="20232024", api_sleep_rate=1)
+ await client.helpers.allPlayers({ season: 20232024, apiSleepRate: 1 })
```

| Python module            | TypeScript module     |
| ------------------------ | --------------------- |
| `client.game_center`     | `client.gameCenter`   |
| `client.teams`, `client.standings`, `client.schedule`, `client.stats`, `client.edge`, `client.players`, `client.misc`, `client.helpers` | same names |

Method renames follow the same rule (`play_by_play` → `playByPlay`,
`goalie_5v5_detail` → `goalie5v5Detail`). No method was added, removed or
renamed beyond the case change.

IDs and seasons accept `string | number`.

### Client options

```diff
- NHLClient(debug=True, timeout=30, follow_redirects=True, ssl_verify=False)
+ new NHLClient({ debug: true, timeout: 30, followRedirects: true })
```

`ssl_verify` was removed. Node's `fetch` has no per-request switch for TLS
verification. If you need it, set `NODE_TLS_REJECT_UNAUTHORIZED=0` for the
process. That is a Node setting, not one the SDK reads, and you should only use
it for local debugging. `debug` logs go to stderr, not the Python `logging`
module.

### Query builder

Import everything from the package root. The classes and their constructor
arguments are the same.

```diff
- from nhlpy.api.query.builder import QueryBuilder
- from nhlpy.api.query.filters.season import SeasonQuery
- from nhlpy.api.query.filters.position import PositionQuery, PositionTypes
- context = QueryBuilder().build(filters=[SeasonQuery(season_start="20232024", season_end="20232024"),
-                                         PositionQuery(position=PositionTypes.CENTER)])
- if not context.is_valid(): print(context.errors)
- client.stats.skater_stats_with_query_context(query_context=context, report_type="summary")
+ import { PositionQuery, PositionTypes, QueryBuilder, SeasonQuery } from 'nhl-api-ts';
+ const context = new QueryBuilder().build([
+   new SeasonQuery(20232024, 20232024),
+   new PositionQuery(PositionTypes.CENTER),
+ ]);
+ if (!context.isValid()) console.error(context.errors);
+ await client.stats.skaterStatsWithQueryContext({ queryContext: context, reportType: 'summary' });
```

| Python                      | TypeScript                |
| --------------------------- | ------------------------- |
| `context.query_str`         | `context.queryStr`        |
| `context.fact_query`        | `context.factQuery`       |
| `context.is_valid()`        | `context.isValid()`       |
| `QueryBuilder(debug=True)`  | `new QueryBuilder({ debug: true })` |
| `StatusQuery(is_active=True)` | `new StatusQuery({ isActive: true })` |

Behavior fix: in nhl-api-py, `DecisionQuery.validate()` returns `None`, so the
builder rejects every decision filter, valid ones included. In nhl-api-ts,
`new DecisionQuery('W')` is accepted, and only values other than `W`, `L` and
`O` are rejected.

### Errors

The exception class names are the same. They are exported from the package
root. Python `ValueError` for bad input becomes `RangeError`.

```diff
- from nhlpy.http_client import ResourceNotFoundException
- try:
-     client.game_center.boxscore(game_id="1")
- except ResourceNotFoundException as e:
-     print(e.status_code)
+ import { ResourceNotFoundException } from 'nhl-api-ts';
+ try {
+   await client.gameCenter.boxscore({ gameId: 1 });
+ } catch (err) {
+   if (err instanceof ResourceNotFoundException) console.log(err.statusCode);
+ }
```

| Python          | TypeScript    |
| --------------- | ------------- |
| `e.status_code` | `err.statusCode` |
| `e.error_code`  | `err.errorCode`  |
| `ValueError`    | `RangeError`     |

Timeouts surface as a `DOMException` named `TimeoutError`, not
`httpx.TimeoutException`. See [docs/errors.md](docs/errors.md).

### Payloads

Response bodies are unchanged and keep the NHL's camelCase keys. The shapes
the SDK builds itself keep their Python key names: `teams.teams()` returns
`common_name` and `franchise_id`.

### Output

`helpers` progress and warning messages go to **stderr**. The CLI's stdout is
always pure JSON.

### New in the port

- A CLI: `npx nhl-api-ts <module> <command>`. See the [README](README.md#cli).
- Full TypeScript types for every parameter object.
