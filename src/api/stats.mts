import {
  DEFAULT_FACT_QUERY,
  type QueryContext,
} from '#src/api/query/builder.mjs';
import { goalieStatsSorts } from '#src/api/query/sorting/goalie-sorts.mjs';
import {
  defaultSortForReport,
  type SortExpr,
} from '#src/api/query/sorting/sorting-options.mjs';
import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  ClubStatsSeason,
  GameLogEntry,
  GoalieReportRows,
  PlayerLanding,
  SkaterReportRows,
  StatsApiPage,
  TeamSummaryRow,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

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
export const gametypesPerSeasonDirectoryByTeam = async (
  ctx: Context,
  { teamAbbr }: { teamAbbr: string },
): Promise<ClubStatsSeason[]> =>
  (await ctx.get(Endpoint.API_WEB_V1, `club-stats-season/${teamAbbr}`)).json();

/**
 * Gets a player's career statistics and biographical information.
 *
 * @param params.playerId NHL player id, e.g. 8481528
 * @example https://api-web.nhle.com/v1/player/8481528/landing
 */
export const playerCareerStats = async (
  ctx: Context,
  { playerId }: { playerId: Id },
): Promise<PlayerLanding> =>
  (await ctx.get(Endpoint.API_WEB_V1, `player/${playerId}/landing`)).json();

/**
 * Gets a player's game log for a specific season and game type.
 *
 * @param params.playerId NHL player id, e.g. 8481528
 * @param params.seasonId Season in YYYYYYYY format, e.g. 20232024
 * @param params.gameType 1=Preseason, 2=Regular season, 3=Playoffs
 * @example https://api-web.nhle.com/v1/player/8481528/game-log/20232024/2
 */
export const playerGameLog = async (
  ctx: Context,
  {
    playerId,
    seasonId,
    gameType,
  }: { playerId: Id; seasonId: Id; gameType: number },
): Promise<GameLogEntry[]> => {
  const data = await (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `player/${playerId}/game-log/${seasonId}/${gameType}`,
    )
  ).json();
  return data.gameLog ?? [];
};

/**
 * Retrieves team summary statistics across one or more seasons.
 *
 * @example await client.stats.teamSummary({ startSeason: '20232024', endSeason: '20232024' })
 */
export const teamSummary = async (
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
): Promise<TeamSummaryRow[]> => {
  const effectiveSortExpr =
    sortExpr && sortExpr.length > 0
      ? sortExpr
      : [
          { property: 'points', direction: 'DESC' },
          { property: 'wins', direction: 'DESC' },
          // aggregated rows span seasons, so they have no teamId
          {
            property: isAggregate ? 'franchiseId' : 'teamId',
            direction: 'ASC',
          },
        ];
  const effectiveCayenneExp =
    defaultCayenneExp ??
    `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;
  const qParams = {
    isAggregate,
    isGame,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };
  const response = await (
    await ctx.get(Endpoint.API_STATS, 'en/team/summary', qParams)
  ).json();
  return response.data;
};

/**
 * Gets simplified skater statistics summary for specified seasons and
 * franchises.
 *
 * @example await client.stats.skaterStatsSummary({ startSeason: '20232024', endSeason: '20232024', franchiseId: 10 })
 */
export const skaterStatsSummary = async (
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
): Promise<SkaterReportRows['summary'][]> => {
  const effectiveSortExpr =
    sortExpr && sortExpr.length > 0
      ? sortExpr
      : [
          { property: 'points', direction: 'DESC' },
          { property: 'gamesPlayed', direction: 'ASC' },
          { property: 'playerId', direction: 'ASC' },
        ];
  const baseCayenneExp =
    defaultCayenneExp ??
    `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;
  const effectiveCayenneExp =
    !defaultCayenneExp && franchiseId
      ? `franchiseId=${franchiseId} and ${baseCayenneExp}`
      : baseCayenneExp;
  const qParams = {
    isAggregate: aggregate,
    isGame: false,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };
  const response = await (
    await ctx.get(Endpoint.API_STATS, 'en/skater/summary', qParams)
  ).json();
  return response.data;
};

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
export const skaterStatsWithQueryContext = async <
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
): Promise<StatsApiPage<SkaterReportRows[Report]>> => {
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
};

/**
 * Retrieves goalie statistics with various filtering and aggregation
 * options.
 *
 * @example await client.stats.goalieStatsSummary({ startSeason: '20232024', statsType: 'advanced' })
 */
export const goalieStatsSummary = async <
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
): Promise<GoalieReportRows[Report][]> => {
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
  const qParams = {
    isAggregate: aggregate,
    isGame: false,
    start,
    limit,
    factCayenneExp,
    sort: JSON.stringify(effectiveSortExpr),
    cayenneExp: effectiveCayenneExp,
  };
  const response = await (
    await ctx.get(Endpoint.API_STATS, `en/goalie/${report}`, qParams)
  ).json();
  return response.data ?? [];
};

export const statsApi = {
  gametypesPerSeasonDirectoryByTeam,
  playerCareerStats,
  playerGameLog,
  teamSummary,
  skaterStatsSummary,
  skaterStatsWithQueryContext,
  goalieStatsSummary,
} as const;
