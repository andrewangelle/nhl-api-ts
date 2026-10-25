# Endpoint specs

`src/specs.mts` tells inference what the SDK actually returns for each
endpoint. An endpoint with no entry returns its body as-is and its root
interface is named after the method (`gameMeta` becomes `GameMeta`).

```ts
export interface EndpointSpec {
  unwrap?: string;
  groupBy?: string;
  name: string;
  emit?: EmitOptions;
}
```

## Name the root interface

```ts
'gameCenter.matchUp': { name: 'GameLanding' },
```

Use this when the method name doesn't match the type name the SDK exports.
Nested interfaces are prefixed with it (`GameLandingSummary`, ...).

## Unwrap an envelope

Stats API endpoints return `{ data: [...], total }` and the SDK returns
`response.data ?? []`. Tell inference to look inside:

```ts
'misc.countries': { unwrap: 'data', name: 'Country' },
'stats.playerGameLog': { unwrap: 'gameLog', name: 'GameLogEntry' },
```

`unwrap` must match the property the SDK method returns. When the unwrapped
value is an array, `name` is the item type: `Country`, not `Country[]`. A
sample with no such property counts as an empty array.

## Split one endpoint into several types

Some endpoints return a different row shape per argument: each skater stats
`reportType`, each goalie `statsType`, each leaders `attribute`. Tag the
samples with that argument and group by the tag:

```ts
// samples.mts
add('stats.skaterLeaders', { attribute, season: 'all' }, (client) =>
  client.stats.skaterLeaders({ attribute }),
);

// specs.mts
'stats.skaterLeaders': { unwrap: 'data', groupBy: 'attribute', name: 'SkaterLeaderRow' },
```

`infer` then writes one group per tag value, for example
`stats.skaterLeaders.goals`, with root interface `SkaterLeaderRowGoals`. In
`src/types/` these become entries of a registry interface so consumers can add
their own. `src/fixtures.mts` types grouped fixtures as `Registry['value']`;
if you add a new grouped endpoint, add its registry to the `if` chain there
too.

## Fold one endpoint into another

When two methods hit the same URL and return the same payload, feed the
samples of one into the other's type instead of inferring a duplicate:

```ts
export const ALIASES = {
  'schedule.dailySchedule': { endpoint: 'schedule.weeklySchedule' },
  'stats.skaterStatsSummary': {
    endpoint: 'stats.skaterStatsWithQueryContext',
    group: 'summary',
  },
};
```

`group` puts the aliased samples into one `groupBy` bucket of the target. The
aliased endpoint gets no report, draft or snapshot of its own.

## Tune the draft

`emit` only changes the draft, not the report or snapshot.

```ts
'misc.config': {
  name: 'StatsConfig',
  emit: {
    mapPaths: ['.playerReportData', '.goalieReportData', '.teamReportData'],
  },
},
```

- `mapPaths`: objects whose keys are data (report names, for example),
  emitted as maps instead of an interface with one property per key seen.
  Objects with 5 or more keys that are all numeric IDs or all `YYYY-MM-DD`
  dates are detected automatically; list other dynamic-key objects here.
- `names`: interface names keyed by path, when the generated one is wrong,
  e.g. `names: { '.summary.scoring[]': 'ScoringPeriod' }`.

After changing a spec, rerun `pnpm api-types:infer`. You don't need to refetch.
