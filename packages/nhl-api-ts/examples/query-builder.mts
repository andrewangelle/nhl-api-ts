/**
 * Top Swedish forwards in 2023-24 regular season, using the query builder.
 *
 *   node examples/query-builder.mts
 */
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
]);

if (!isValidQuery(queryContext)) {
  throw new Error(`invalid filters: ${queryContext.errors.join('; ')}`);
}
console.log(`cayenneExp: ${queryContext.query}`);

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'summary',
  limit: 10,
});

console.log(`${total} matching skaters, top 10 by points:`);
for (const row of data) {
  console.log(`  ${row.skaterFullName.padEnd(24)} ${row.points}`);
}
