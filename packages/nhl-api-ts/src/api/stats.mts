import {
  DEFAULT_FACT_QUERY,
  type QueryContext,
} from '#src/api/query/builder.mjs';
import { goalieStatsSorts } from '#src/api/query/sorting/goalie-sorts.mjs';
import {
  defaultSortForReport,
  defaultSortForSkaterStatsSummary,
  defaultSortForTeamSummary,
  type SortExpr,
} from '#src/api/query/sorting/sorting-options.mjs';
import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  ClubStats,
  ClubStatsSeason,
  GameLogEntry,
  GoalieLeaderCategory,
  GoalieReportRows,
  GoalieStatsLeaders,
  OpenUnion,
  PlayerLanding,
  SkaterLeaderCategory,
  SkaterReportRows,
  SkaterStatsLeaders,
  StatsApiPage,
  TeamSummaryRow,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

/**
 * "<season>/<gameType>", or the API's current-season segment when no season is
 * given. Most endpoints take `now`; the stats-leaders ones only take `current`.
 */
function seasonGameTypeSegments(
  season: Id | undefined,
  gameType: number,
  current: 'now' | 'current',
): string {
  if (season === undefined || season === null) {
    return current;
  }
  return `${season}/${gameType}`;
}

/** Skater reports whose rows have no `gamesPlayed`, so the API rejects the default fact filter. */
const REPORTS_WITHOUT_GAMES_PLAYED: readonly string[] = [
  'shootout',
  'penaltyShots',
];

export interface TeamSummaryParams {
  /** Start season in YYYYYYYY format, e.g. 20202021 */
  startSeason: Id;
  /** End season in YYYYYYYY format, e.g. 20232024 */
  endSeason: Id;
  /** 1=Preseason, 2=Regular season (default), 3=Playoffs */
  gameTypeId?: number;
  /** Game-level stats rather than season-level. Defaults to false. */
  isGame?: boolean;
  /** Aggregate stats across the selected seasons. Defaults to false. */
  isAggregate?: boolean;
  /** Custom sort. Defaults to points DESC, wins DESC, teamId ASC (franchiseId ASC when aggregating). */
  sortExpr?: SortExpr[];
  /** Pagination offset. Defaults to 0. */
  start?: number;
  /** Max results. Defaults to 50. */
  limit?: number;
  /** Base fact filter. Defaults to "gamesPlayed>1". */
  factCayenneExp?: string;
  /** Overrides the generated cayenneExp filter entirely. */
  defaultCayenneExp?: string;
}

export interface SkaterStatsSummaryParams {
  startSeason: Id;
  endSeason: Id;
  /** Limit results to a franchise. */
  franchiseId?: Id;
  gameTypeId?: number;
  aggregate?: boolean;
  /** Custom sort. Defaults to points DESC, gamesPlayed ASC, playerId ASC. */
  sortExpr?: SortExpr[];
  start?: number;
  /** Max results. Defaults to 25. */
  limit?: number;
  /** Base fact filter. Defaults to "gamesPlayed>=1". */
  factCayenneExp?: string;
  defaultCayenneExp?: string;
}

export interface SkaterStatsWithQueryContextParams<
  Report extends keyof SkaterReportRows = keyof SkaterReportRows,
> {
  /** Built with `buildQuery(filters)`. */
  queryContext: QueryContext;
  /**
   * Report type, e.g. summary, bios, faceoffpercentages, faceoffwins,
   * goalsForAgainst, realtime, penalties, penaltykill, penaltyShots,
   * powerplay, puckPossessions, summaryshooting, percentages, scoringRates,
   * scoringpergame, shootout, shottype, timeonice
   */
  reportType: Report;
  /** Custom sort. Defaults to the report type's default sort. */
  sortExpr?: SortExpr[];
  aggregate?: boolean;
  start?: number;
  limit?: number;
}

export interface GoalieStatsSummaryParams<
  Report extends keyof GoalieReportRows = keyof GoalieReportRows,
> {
  startSeason: Id;
  /** Defaults to `startSeason`. */
  endSeason?: Id;
  /**
   * Report type: summary (default), advanced, bios, daysrest, penaltyShots,
   * savesByStrength, shootout, startedVsRelieved
   */
  statsType?: Report;
  gameTypeId?: number;
  franchiseId?: Id;
  aggregate?: boolean;
  sortExpr?: SortExpr[];
  start?: number;
  limit?: number;
  factCayenneExp?: string;
  defaultCayenneExp?: string;
}

/**
 * Gets all game types played by a team throughout their history.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @example https://api-web.nhle.com/v1/club-stats-season/TOR
 */
export async function gametypesPerSeasonDirectoryByTeam(
  ctx: Context,
  { teamAbbr }: { teamAbbr: string },
): Promise<ClubStatsSeason[]> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `club-stats-season/${teamAbbr}`)
  ).json();
}

/**
 * Gets a player's career statistics and biographical information.
 *
 * @param params.playerId NHL player id, e.g. 8481528
 * @example https://api-web.nhle.com/v1/player/8481528/landing
 */
export async function playerCareerStats(
  ctx: Context,
  { playerId }: { playerId: Id },
): Promise<PlayerLanding> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `player/${playerId}/landing`)
  ).json();
}

/**
 * Gets a player's game log for a season and game type.
 *
 * @param params.playerId NHL player id, e.g. 8481528
 * @param params.seasonId Season in YYYYYYYY format, e.g. 20232024. Defaults to the current season ("now").
 * @param params.gameType 1=Preseason, 2=Regular season (default), 3=Playoffs. Ignored when `seasonId` is omitted.
 * @example https://api-web.nhle.com/v1/player/8481528/game-log/20232024/2
 */
export async function playerGameLog(
  ctx: Context,
  {
    playerId,
    seasonId,
    gameType = 2,
  }: { playerId: Id; seasonId?: Id; gameType?: number },
): Promise<GameLogEntry[]> {
  const data = await (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `player/${playerId}/game-log/${seasonGameTypeSegments(seasonId, gameType, 'now')}`,
    )
  ).json();
  return data.gameLog ?? [];
}

export interface StatsLeadersParams<Category extends string> {
  /** Season in YYYYYYYY format, e.g. 20232024. Defaults to the current season ("current"). */
  season?: Id;
  /** 2=Regular season (default), 3=Playoffs. Ignored when `season` is omitted. */
  gameType?: number;
  /** Categories to include. Defaults to every category. An unknown category is a 400. */
  categories?: readonly Category[];
  /** Rows per category. The API defaults to 5; -1 returns every player. */
  limit?: number;
}

function statsLeadersQuery({
  categories,
  limit,
}: StatsLeadersParams<string>): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (categories && categories.length > 0) {
    query.categories = categories.join(',');
  }
  if (limit !== undefined) {
    query.limit = limit;
  }
  return query;
}

/**
 * Gets the skater stats leaders for a season, keyed by category.
 *
 * @param params.season Season in YYYYYYYY format. Defaults to the current season.
 * @param params.gameType 2=Regular season (default), 3=Playoffs. Ignored when `season` is omitted.
 * @param params.categories Categories to include, e.g. ['goals', 'points']. Defaults to all.
 * @param params.limit Rows per category. The API defaults to 5; -1 returns every player.
 * @example https://api-web.nhle.com/v1/skater-stats-leaders/20232024/2?categories=goals,points&limit=10
 */
export async function skaterStatsLeaders(
  ctx: Context,
  params: StatsLeadersParams<OpenUnion<SkaterLeaderCategory>> = {},
): Promise<SkaterStatsLeaders> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `skater-stats-leaders/${seasonGameTypeSegments(params.season, params.gameType ?? 2, 'current')}`,
      statsLeadersQuery(params),
    )
  ).json();
}

/**
 * Gets the goalie stats leaders for a season, keyed by category.
 *
 * @param params.season Season in YYYYYYYY format. Defaults to the current season.
 * @param params.gameType 2=Regular season (default), 3=Playoffs. Ignored when `season` is omitted.
 * @param params.categories Categories to include, e.g. ['wins', 'savePctg']. Defaults to all.
 * @param params.limit Rows per category. The API defaults to 5; -1 returns every goalie.
 * @example https://api-web.nhle.com/v1/goalie-stats-leaders/20232024/2?categories=wins&limit=10
 */
export async function goalieStatsLeaders(
  ctx: Context,
  params: StatsLeadersParams<OpenUnion<GoalieLeaderCategory>> = {},
): Promise<GoalieStatsLeaders> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `goalie-stats-leaders/${seasonGameTypeSegments(params.season, params.gameType ?? 2, 'current')}`,
      statsLeadersQuery(params),
    )
  ).json();
}

/**
 * Gets a team's skater and goalie stats for a season and game type.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.season Season in YYYYYYYY format, e.g. 20232024. Defaults to the current season ("now").
 * @param params.gameType 2=Regular season (default), 3=Playoffs. Ignored when `season` is omitted.
 * @example https://api-web.nhle.com/v1/club-stats/TOR/20232024/2
 */
export async function clubStats(
  ctx: Context,
  {
    teamAbbr,
    season,
    gameType = 2,
  }: { teamAbbr: string; season?: Id; gameType?: number },
): Promise<ClubStats> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `club-stats/${teamAbbr}/${seasonGameTypeSegments(season, gameType, 'now')}`,
    )
  ).json();
}

/**
 * Retrieves team summary statistics across one or more seasons.
 *
 * @example await client.stats.teamSummary({ startSeason: '20232024', endSeason: '20232024' })
 */
export async function teamSummary(
  ctx: Context,
  {
    startSeason,
    endSeason,
    gameTypeId = 2,
    isGame = false,
    isAggregate = false,
    sortExpr,
    start = 0,
    limit = 50,
    factCayenneExp = 'gamesPlayed>1',
    defaultCayenneExp,
  }: TeamSummaryParams,
): Promise<TeamSummaryRow[]> {
  const effectiveSortExpr = defaultSortForTeamSummary(sortExpr, isAggregate);

  const effectiveCayenneExp =
    defaultCayenneExp ??
    `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;

  const queryParams = {
    isAggregate,
    isGame,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };

  const response = await (
    await ctx.get(Endpoint.API_STATS, 'en/team/summary', queryParams)
  ).json();

  return response.data;
}

/**
 * Gets simplified skater statistics summary for specified seasons and
 * franchises.
 *
 * @example await client.stats.skaterStatsSummary({ startSeason: '20232024', endSeason: '20232024', franchiseId: 10 })
 */
export async function skaterStatsSummary(
  ctx: Context,
  {
    startSeason,
    endSeason,
    franchiseId,
    gameTypeId = 2,
    aggregate = false,
    sortExpr,
    start = 0,
    limit = 25,
    factCayenneExp = 'gamesPlayed>=1',
    defaultCayenneExp,
  }: SkaterStatsSummaryParams,
): Promise<SkaterReportRows['summary'][]> {
  const effectiveSortExpr = defaultSortForSkaterStatsSummary(sortExpr);

  const baseCayenneExp =
    defaultCayenneExp ??
    `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;

  const effectiveCayenneExp =
    !defaultCayenneExp && franchiseId
      ? `franchiseId=${franchiseId} and ${baseCayenneExp}`
      : baseCayenneExp;

  const queryParams = {
    isAggregate: aggregate,
    isGame: false,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };

  const response = await (
    await ctx.get(Endpoint.API_STATS, 'en/skater/summary', queryParams)
  ).json();

  return response.data;
}

/**
 * Retrieves skater statistics using a query context and specified report
 * type. Returns the full response (`{ data, total }`).
 *
 * The default fact filter (`gamesPlayed>=1`) is dropped for the `shootout` and
 * `penaltyShots` reports, which have no `gamesPlayed` column. A fact filter
 * you pass to `buildQuery` is sent as given.
 *
 * @example
 * const context = buildQuery([
 *   filter.season('20232024', '20232024'),
 *   filter.position(PositionTypes.CENTER),
 * ]);
 * await client.stats.skaterStatsWithQueryContext({ queryContext: context, reportType: 'summary' });
 */
export async function skaterStatsWithQueryContext<
  Report extends keyof SkaterReportRows,
>(
  ctx: Context,
  {
    queryContext,
    reportType,
    sortExpr,
    aggregate = false,
    start = 0,
    limit = 25,
  }: SkaterStatsWithQueryContextParams<Report>,
): Promise<StatsApiPage<SkaterReportRows[Report]>> {
  const effectiveSortExpr =
    sortExpr && sortExpr.length > 0
      ? sortExpr
      : defaultSortForReport(reportType);

  const qParams = {
    isAggregate: aggregate,
    isGame: false,
    start,
    limit,
    factCayenneExp:
      queryContext.factQuery === DEFAULT_FACT_QUERY &&
      REPORTS_WITHOUT_GAMES_PLAYED.includes(reportType)
        ? ''
        : queryContext.factQuery,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: queryContext.query,
  };
  return (
    await ctx.get(Endpoint.API_STATS, `en/skater/${reportType}`, qParams)
  ).json();
}

/**
 * Retrieves goalie statistics with various filtering and aggregation
 * options.
 *
 * @example await client.stats.goalieStatsSummary({ startSeason: '20232024', statsType: 'advanced' })
 */
export async function goalieStatsSummary<
  Report extends keyof GoalieReportRows = 'summary',
>(
  ctx: Context,
  {
    startSeason,
    endSeason,
    statsType,
    gameTypeId = 2,
    franchiseId,
    aggregate = false,
    sortExpr,
    start = 0,
    limit = 25,
    factCayenneExp,
    defaultCayenneExp,
  }: GoalieStatsSummaryParams<Report>,
): Promise<GoalieReportRows[Report][]> {
  const report: keyof GoalieReportRows = statsType ?? 'summary';

  const effectiveEndSeason =
    endSeason === undefined || endSeason === null ? startSeason : endSeason;

  const effectiveSortExpr =
    sortExpr && sortExpr.length > 0 ? sortExpr : goalieStatsSorts(report);

  const baseCayenneExp =
    defaultCayenneExp ??
    `gameTypeId=${gameTypeId} and seasonId<=${effectiveEndSeason} and seasonId>=${startSeason}`;

  const effectiveCayenneExp = franchiseId
    ? `franchiseId=${franchiseId} and ${baseCayenneExp}`
    : baseCayenneExp;

  const queryParams = {
    isAggregate: aggregate,
    isGame: false,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };

  const response = await (
    await ctx.get(Endpoint.API_STATS, `en/goalie/${report}`, queryParams)
  ).json();

  return response.data ?? [];
}

export const statsApi = {
  gametypesPerSeasonDirectoryByTeam,
  playerCareerStats,
  playerGameLog,
  skaterStatsLeaders,
  goalieStatsLeaders,
  clubStats,
  teamSummary,
  skaterStatsSummary,
  skaterStatsWithQueryContext,
  goalieStatsSummary,
} as const;
