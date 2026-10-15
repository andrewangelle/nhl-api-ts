# Paginate stats reports

The stats API endpoints (`client.stats.teamSummary`, `skaterStatsSummary`,
`skaterStatsWithQueryContext`, `goalieStatsSummary`) are paged with `start`
(offset) and `limit` (page size). The web API endpoints are not paged.

> **The stats API returns at most 100 rows per request.** A larger `limit`
> is silently capped at 100. `limit: -1` returns every row in one request.

## With a total: `skaterStatsWithQueryContext`

This method returns the whole envelope, `{ data, total }`. Advance by the
number of rows you actually received, not by `limit`:

```ts
import { buildQuery, createNHLClient, filter } from 'nhl-api-ts';
import type { JsonObject } from 'nhl-api-ts';

const client = createNHLClient();
const queryContext = buildQuery([filter.season(20232024, 20232024)]);

const rows: JsonObject[] = [];
while (true) {
  const page = await client.stats.skaterStatsWithQueryContext({
    queryContext,
    reportType: 'summary',
    start: rows.length,
    limit: 100,
  });
  rows.push(...page.data);
  if (page.data.length === 0 || rows.length >= page.total) {
    break;
  }
}
console.log(`${rows.length} skaters`);
```

## Without a total: the `*Summary` methods

`teamSummary`, `skaterStatsSummary` and `goalieStatsSummary` return only the
`data` array. Use `limit` of 100 or less, and stop when a page comes back
shorter than `limit`:

```ts
const limit = 100;
const goalies: JsonObject[] = [];
while (true) {
  const page = await client.stats.goalieStatsSummary({
    startSeason: 20232024,
    start: goalies.length,
    limit,
  });
  goalies.push(...page);
  if (page.length < limit) {
    break;
  }
}
```

With a `limit` above 100, the first page is capped at 100 rows, so
`page.length < limit` holds right away and the loop stops after one page.

## Everything at once

```ts
const all = await client.stats.skaterStatsSummary({
  startSeason: 20232024,
  endSeason: 20232024,
  limit: -1,
});
```

This is one request. It works today but isn't documented by the NHL. Page
explicitly if you need it to keep working.

## Notes

- Keep the sort stable across pages. Every default sort ends on a unique key
  (`playerId` or `teamId`), so rows don't shift between pages. If you pass
  your own `sortExpr`, end it with `{ property: 'playerId', direction: 'ASC' }`.
- From the CLI: `--start` and `--limit` on any `stats` command.

Runnable version: [`examples/paginate-stats.mts`](../../examples/paginate-stats.mts).
