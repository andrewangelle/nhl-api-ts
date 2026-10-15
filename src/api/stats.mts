import type { QueryContext } from '#src/api/query/builder.mjs';
import { goalieStatsSorts } from '#src/api/query/filters/goalie-sorts.mjs';
import {
  type SortExpr,
  SortingOptions,
} from '#src/api/query/sorting/sorting-options.mjs';
import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

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
  /** Custom sort. Defaults to points DESC, wins DESC, teamId ASC. */
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

export interface SkaterStatsWithQueryContextParams {
  /** Built with `QueryBuilder.build(filters)`. */
  queryContext: QueryContext;
  /**
   * Report type, e.g. summary, bios, faceoffpercentages, faceoffwins,
   * goalsForAgainst, realtime, penalties, penaltykill, penaltyShots,
   * powerplay, puckPossessions, summaryshooting, percentages, scoringRates,
   * scoringpergame, shootout, shottype, timeonice
   */
  reportType: string;
  /** Custom sort. Defaults to the report type's default sort. */
  sortExpr?: SortExpr[];
  aggregate?: boolean;
  start?: number;
  limit?: number;
}

export interface GoalieStatsSummaryParams {
  startSeason: Id;
  /** Defaults to `startSeason`. */
  endSeason?: Id;
  /**
   * Report type: summary (default), advanced, bios, daysrest, penaltyShots,
   * savesByStrength, shootout, startedVsRelieved
   */
  statsType?: string;
  gameTypeId?: number;
  franchiseId?: Id;
  aggregate?: boolean;
  sortExpr?: SortExpr[];
  start?: number;
  limit?: number;
  factCayenneExp?: string;
  defaultCayenneExp?: string;
}

export class Stats {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  /**
   * Gets all game types played by a team throughout their history.
   *
   * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
   * @example https://api-web.nhle.com/v1/club-stats-season/TOR
   */
  async gametypesPerSeasonDirectoryByTeam({
    teamAbbr,
  }: {
    teamAbbr: string;
  }): Promise<JsonObject[]> {
    return (
      await this.client.get(
        Endpoint.API_WEB_V1,
        `club-stats-season/${teamAbbr}`,
      )
    ).json();
  }

  /**
   * Gets a player's career statistics and biographical information.
   *
   * @param params.playerId NHL player id, e.g. 8481528
   * @example https://api-web.nhle.com/v1/player/8481528/landing
   */
  async playerCareerStats({ playerId }: { playerId: Id }): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_WEB_V1, `player/${playerId}/landing`)
    ).json();
  }

  /**
   * Gets a player's game log for a specific season and game type.
   *
   * @param params.playerId NHL player id, e.g. 8481528
   * @param params.seasonId Season in YYYYYYYY format, e.g. 20232024
   * @param params.gameType 1=Preseason, 2=Regular season, 3=Playoffs
   * @example https://api-web.nhle.com/v1/player/8481528/game-log/20232024/2
   */
  async playerGameLog({
    playerId,
    seasonId,
    gameType,
  }: {
    playerId: Id;
    seasonId: Id;
    gameType: number;
  }): Promise<JsonObject[]> {
    const data = await (
      await this.client.get(
        Endpoint.API_WEB_V1,
        `player/${playerId}/game-log/${seasonId}/${gameType}`,
      )
    ).json();
    return data.gameLog ?? [];
  }

  /**
   * Retrieves team summary statistics across one or more seasons.
   *
   * @example await client.stats.teamSummary({ startSeason: '20232024', endSeason: '20232024' })
   */
  async teamSummary({
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
  }: TeamSummaryParams): Promise<JsonObject[]> {
    if (!sortExpr || sortExpr.length === 0) {
      sortExpr = [
        { property: 'points', direction: 'DESC' },
        { property: 'wins', direction: 'DESC' },
        { property: 'teamId', direction: 'ASC' },
      ];
    }
    if (!defaultCayenneExp) {
      defaultCayenneExp = `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;
    }
    const qParams = {
      isAggregate,
      isGame,
      start,
      limit,
      factCayenneExp,
      sort: JSON.stringify(sortExpr),
      cayenneExp: defaultCayenneExp,
    };
    const response = await (
      await this.client.get(Endpoint.API_STATS, 'en/team/summary', qParams)
    ).json();
    return response.data;
  }

  /**
   * Gets simplified skater statistics summary for specified seasons and
   * franchises.
   *
   * @example await client.stats.skaterStatsSummary({ startSeason: '20232024', endSeason: '20232024', franchiseId: 10 })
   */
  async skaterStatsSummary({
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
  }: SkaterStatsSummaryParams): Promise<JsonObject[]> {
    if (!sortExpr || sortExpr.length === 0) {
      sortExpr = [
        { property: 'points', direction: 'DESC' },
        { property: 'gamesPlayed', direction: 'ASC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    }
    if (!defaultCayenneExp) {
      defaultCayenneExp = `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;
      if (franchiseId) {
        defaultCayenneExp = `franchiseId=${franchiseId} and ${defaultCayenneExp}`;
      }
    }
    const qParams = {
      isAggregate: aggregate,
      isGame: false,
      start,
      limit,
      factCayenneExp,
      sort: JSON.stringify(sortExpr),
      cayenneExp: defaultCayenneExp,
    };
    const response = await (
      await this.client.get(Endpoint.API_STATS, 'en/skater/summary', qParams)
    ).json();
    return response.data;
  }

  /**
   * Retrieves skater statistics using a query context and specified report
   * type. Returns the full response (`{ data, total }`).
   *
   * @example
   * const context = new QueryBuilder().build([
   *   new SeasonQuery('20232024', '20232024'),
   *   new PositionQuery(PositionTypes.CENTER),
   * ]);
   * await client.stats.skaterStatsWithQueryContext({ queryContext: context, reportType: 'summary' });
   */
  async skaterStatsWithQueryContext({
    queryContext,
    reportType,
    sortExpr,
    aggregate = false,
    start = 0,
    limit = 25,
  }: SkaterStatsWithQueryContextParams): Promise<JsonObject> {
    if (!sortExpr || sortExpr.length === 0) {
      sortExpr = SortingOptions.getDefaultSortingForReport(reportType);
    }
    const qParams = {
      isAggregate: aggregate,
      isGame: false,
      start,
      limit,
      factCayenneExp: queryContext.factQuery,
      sort: JSON.stringify(sortExpr),
      cayenneExp: queryContext.queryStr,
    };
    return (
      await this.client.get(
        Endpoint.API_STATS,
        `en/skater/${reportType}`,
        qParams,
      )
    ).json();
  }

  /**
   * Retrieves goalie statistics with various filtering and aggregation
   * options.
   *
   * @example await client.stats.goalieStatsSummary({ startSeason: '20232024', statsType: 'advanced' })
   */
  async goalieStatsSummary({
    startSeason,
    endSeason,
    statsType = 'summary',
    gameTypeId = 2,
    franchiseId,
    aggregate = false,
    sortExpr,
    start = 0,
    limit = 25,
    factCayenneExp,
    defaultCayenneExp,
  }: GoalieStatsSummaryParams): Promise<JsonObject[]> {
    if (endSeason === undefined || endSeason === null) {
      endSeason = startSeason;
    }
    if (!sortExpr || sortExpr.length === 0) {
      sortExpr = goalieStatsSorts(statsType);
    }
    if (!defaultCayenneExp) {
      defaultCayenneExp = `gameTypeId=${gameTypeId} and seasonId<=${endSeason} and seasonId>=${startSeason}`;
    }
    if (franchiseId) {
      defaultCayenneExp = `franchiseId=${franchiseId} and ${defaultCayenneExp}`;
    }
    const qParams = {
      isAggregate: aggregate,
      isGame: false,
      start,
      limit,
      factCayenneExp,
      sort: JSON.stringify(sortExpr),
      cayenneExp: defaultCayenneExp,
    };
    const response = await (
      await this.client.get(
        Endpoint.API_STATS,
        `en/goalie/${statsType}`,
        qParams,
      )
    ).json();
    return response.data ?? [];
  }
}
