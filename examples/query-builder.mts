/**
 * Top Swedish forwards in 2023-24 regular season, using the query builder.
 *
 *   node examples/query-builder.mts
 */
import {
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
]);

if (!queryContext.isValid()) {
  throw new Error(`invalid filters: ${queryContext.errors.join('; ')}`);
}
console.log(`cayenneExp: ${queryContext.queryStr}`);

const { data, total } = await client.stats.skaterStatsWithQueryContext({
  queryContext,
  reportType: 'summary',
  limit: 10,
});

console.log(`${total} matching skaters, top 10 by points:`);
for (const row of data) {
  console.log(`  ${row.skaterFullName.padEnd(24)} ${row.points}`);
}
