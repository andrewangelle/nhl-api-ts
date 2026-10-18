/**
 * Page through every skater row of a season report.
 *
 *   node examples/paginate-stats.mts
 */
import {
  buildQuery,
  createNHLClient,
  filter,
  type SkaterReportRows,
} from 'nhl-api-ts';

const client = createNHLClient();
const queryContext = buildQuery([filter.season(20232024, 20232024)]);

// The stats API caps pages at 100 rows, so advance by rows received.
const rows: SkaterReportRows['summary'][] = [];
while (true) {
  const page = await client.stats.skaterStatsWithQueryContext({
    queryContext,
    reportType: 'summary',
    start: rows.length,
    limit: 100,
  });
  rows.push(...page.data);
  console.log(`  fetched ${rows.length} / ${page.total}`);
  if (page.data.length === 0 || rows.length >= page.total) {
    break;
  }
}

const goals = rows.reduce((sum, row) => sum + row.goals, 0);
console.log(`${rows.length} skaters scored ${goals} goals`);
