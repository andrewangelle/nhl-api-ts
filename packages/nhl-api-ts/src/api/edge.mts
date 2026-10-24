import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  ByTheNumbers,
  CatGoalieDetail,
  CatSkaterDetail,
  Goalie5v5Detail,
  Goalie5v5Top10Row,
  GoalieComparison,
  GoalieDetail,
  GoalieLanding,
  GoalieSavePercentageDetail,
  GoalieSavePercentageTop10Row,
  GoalieShotLocationDetail,
  GoalieShotLocationTop10Row,
  OpenUnion,
  SkaterComparison,
  SkaterDetail,
  SkaterDistanceTop10Row,
  SkaterLanding,
  SkaterShotLocationDetail,
  SkaterShotLocationTop10Row,
  SkaterShotSpeedDetail,
  SkaterShotSpeedTop10Row,
  SkaterSkatingDistanceDetail,
  SkaterSkatingSpeedDetail,
  SkaterSpeedTop10Row,
  SkaterZoneTime,
  SkaterZoneTimeTop10Row,
  TeamComparison,
  TeamDetail,
  TeamLanding,
  TeamShotLocationDetail,
  TeamShotLocationTop10Row,
  TeamShotSpeedDetail,
  TeamShotSpeedTop10Row,
  TeamSkatingDistanceDetail,
  TeamSkatingDistanceTop10Row,
  TeamSkatingSpeedDetail,
  TeamSkatingSpeedTop10Row,
  TeamZoneTimeDetails,
  TeamZoneTimeTop10Row,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

export interface EdgeSeasonParams {
  /** Season in YYYYYYYY format, e.g. 20232024. Defaults to the current season ("now"). */
  season?: Id;
  /** 2=Regular season (default), 3=Playoffs. Ignored when `season` is omitted. */
  gameType?: number;
}

export interface EdgePlayerParams extends EdgeSeasonParams {
  /** NHL player id, e.g. 8478402 */
  playerId: Id;
}

export interface EdgeTeamParams extends EdgeSeasonParams {
  /** NHL team id, e.g. 10 */
  teamId: Id;
}

/** Player positions of an EDGE top-10 leaderboard. */
export const EdgePositions = {
  ALL: 'all',
  FORWARDS: 'forwards',
  DEFENSE: 'defense',
} as const;

export type EdgePosition = OpenUnion<
  (typeof EdgePositions)[keyof typeof EdgePositions]
>;

/** Game strengths of an EDGE top-10 leaderboard. */
export const EdgeStrengths = {
  ALL: 'all',
  EVEN: 'es',
  POWER_PLAY: 'pp',
  PENALTY_KILL: 'pk',
} as const;

export type EdgeStrength = OpenUnion<
  (typeof EdgeStrengths)[keyof typeof EdgeStrengths]
>;

/** Rink zones; the `sortBy` of the zone time top-10s. */
export const EdgeZones = {
  OFFENSIVE: 'offensive',
  NEUTRAL: 'neutral',
  DEFENSIVE: 'defensive',
} as const;

export type EdgeZone = OpenUnion<(typeof EdgeZones)[keyof typeof EdgeZones]>;

export type EdgeSkatingDistanceSortBy = OpenUnion<
  'total' | 'per-60' | 'max-game' | 'max-period'
>;
export type EdgeSkatingSpeedSortBy = OpenUnion<
  'max' | 'over-22' | '20-22' | '18-20'
>;
export type EdgeShotSpeedSortBy = OpenUnion<
  'max' | 'over-100' | '90-99' | '80-89' | '70-79'
>;
export type EdgeShotLocationSortBy = OpenUnion<
  'sog' | 'goals' | 'shooting-pctg'
>;
/** Shot location area: every shot, high danger, mid range or long range. */
export type EdgeShotLocationCategory = OpenUnion<
  'all' | 'high' | 'mid' | 'long'
>;
export type EdgeGoalieShotLocationSortBy = OpenUnion<
  'save-pctg' | 'saves' | 'goals-against' | 'shots-against'
>;
export type EdgeGoalie5v5SortBy = OpenUnion<
  'save-pctg' | 'save-pctg-close' | 'shots' | 'shots-per-60'
>;
export type EdgeGoalieSavePercentageSortBy = OpenUnion<'games' | 'pctg'>;

export interface EdgeTop10Params<SortBy extends string>
  extends EdgeSeasonParams {
  /** Metric to rank by. Every row carries every metric; this only reorders. */
  sortBy: SortBy;
}

export interface EdgePositionTop10Params<SortBy extends string>
  extends EdgeTop10Params<SortBy> {
  /** 'all' (default), 'forwards' or 'defense'. See `EdgePositions`. */
  positions?: EdgePosition;
}

export interface EdgeStrengthTop10Params<SortBy extends string>
  extends EdgePositionTop10Params<SortBy> {
  /** 'all' (default), 'es', 'pp' or 'pk'. See `EdgeStrengths`. */
  strength?: EdgeStrength;
}

export interface EdgeShotLocationTop10Params
  extends EdgePositionTop10Params<EdgeShotLocationSortBy> {
  /** 'all' (default), 'high', 'mid' or 'long'. */
  category?: EdgeShotLocationCategory;
}

export interface EdgeTeamZoneTimeTop10Params extends EdgeTop10Params<EdgeZone> {
  /** 'all' (default), 'es', 'pp' or 'pk'. See `EdgeStrengths`. */
  strength?: EdgeStrength;
}

export interface EdgeGoalieShotLocationTop10Params
  extends EdgeTop10Params<EdgeGoalieShotLocationSortBy> {
  /** 'all' (default), 'high', 'mid' or 'long'. */
  category?: EdgeShotLocationCategory;
}

/**
 * "<path>/<segments...>/now" when no season is given, else
 * "<path>/<segments...>/<season>/<gameType>".
 */
function edgeResource(
  path: string,
  segments: Id[],
  { season, gameType = 2 }: EdgeSeasonParams,
): string {
  const base = [path, ...segments].join('/');
  if (season === undefined || season === null) {
    return `${base}/now`;
  }
  return `${base}/${season}/${gameType}`;
}

async function getEdgeSegments<Body>(
  ctx: Context,
  path: string,
  segments: Id[],
  params: EdgeSeasonParams,
): Promise<Body> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, edgeResource(path, segments, params))
  ).json();
}

async function getEdge<Body>(
  ctx: Context,
  path: string,
  id: Id | undefined,
  params: EdgeSeasonParams,
): Promise<Body> {
  return getEdgeSegments(ctx, path, id === undefined ? [] : [id], params);
}

// ========================
// SKATER ENDPOINTS
// ========================

/**
 * Get NHL EDGE skater detail statistics for a specific player.
 *
 * @example await client.edge.skaterDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterDetail> {
  return getEdge(ctx, 'edge/skater-detail', params.playerId, params);
}

/**
 * Get NHL EDGE shot speed details for a specific skater.
 *
 * @example await client.edge.skaterShotSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterShotSpeedDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterShotSpeedDetail> {
  return getEdge(ctx, 'edge/skater-shot-speed-detail', params.playerId, params);
}

/**
 * Get NHL EDGE skating speed details for a specific skater.
 *
 * @example await client.edge.skaterSkatingSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterSkatingSpeedDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterSkatingSpeedDetail> {
  return getEdge(
    ctx,
    'edge/skater-skating-speed-detail',
    params.playerId,
    params,
  );
}

/**
 * Get NHL EDGE shot location details for a specific skater.
 *
 * @example await client.edge.skaterShotLocationDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterShotLocationDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterShotLocationDetail> {
  return getEdge(
    ctx,
    'edge/skater-shot-location-detail',
    params.playerId,
    params,
  );
}

/**
 * Get NHL EDGE skating distance details for a specific skater.
 *
 * @example await client.edge.skaterSkatingDistanceDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterSkatingDistanceDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterSkatingDistanceDetail> {
  return getEdge(
    ctx,
    'edge/skater-skating-distance-detail',
    params.playerId,
    params,
  );
}

/**
 * Get NHL EDGE comparison statistics for a specific skater.
 *
 * @example await client.edge.skaterComparison({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterComparison(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterComparison> {
  return getEdge(ctx, 'edge/skater-comparison', params.playerId, params);
}

/**
 * Get NHL EDGE zone time details for a specific skater.
 *
 * @example await client.edge.skaterZoneTime({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function skaterZoneTime(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<SkaterZoneTime> {
  return getEdge(ctx, 'edge/skater-zone-time', params.playerId, params);
}

/**
 * Get NHL EDGE skater landing page data.
 *
 * @example await client.edge.skaterLanding({ season: '20232024' })
 */
export async function skaterLanding(
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<SkaterLanding> {
  return getEdge(ctx, 'edge/skater-landing', undefined, params);
}

/**
 * Get NHL CAT (Catch All Tracking) EDGE skater details.
 *
 * @example await client.edge.catSkaterDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function catSkaterDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<CatSkaterDetail> {
  return getEdge(ctx, 'cat/edge/skater-detail', params.playerId, params);
}

// ========================
// GOALIE ENDPOINTS
// ========================

/**
 * Get NHL EDGE goalie detail statistics for a specific player.
 *
 * @example await client.edge.goalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function goalieDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<GoalieDetail> {
  return getEdge(ctx, 'edge/goalie-detail', params.playerId, params);
}

/**
 * Get NHL EDGE shot location details for a specific goalie.
 *
 * @example await client.edge.goalieShotLocationDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function goalieShotLocationDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<GoalieShotLocationDetail> {
  return getEdge(
    ctx,
    'edge/goalie-shot-location-detail',
    params.playerId,
    params,
  );
}

/**
 * Get NHL EDGE 5v5 performance details for a specific goalie.
 *
 * @example await client.edge.goalie5v5Detail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function goalie5v5Detail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<Goalie5v5Detail> {
  return getEdge(ctx, 'edge/goalie-5v5-detail', params.playerId, params);
}

/**
 * Get NHL EDGE comparison statistics for a specific goalie.
 *
 * @example await client.edge.goalieComparison({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function goalieComparison(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<GoalieComparison> {
  return getEdge(ctx, 'edge/goalie-comparison', params.playerId, params);
}

/**
 * Get NHL EDGE save percentage details for a specific goalie.
 *
 * @example await client.edge.goalieSavePercentageDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function goalieSavePercentageDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<GoalieSavePercentageDetail> {
  return getEdge(
    ctx,
    'edge/goalie-save-percentage-detail',
    params.playerId,
    params,
  );
}

/**
 * Get NHL EDGE goalie landing page data.
 *
 * @example await client.edge.goalieLanding({ season: '20232024' })
 */
export async function goalieLanding(
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<GoalieLanding> {
  return getEdge(ctx, 'edge/goalie-landing', undefined, params);
}

/**
 * Get NHL CAT (Catch All Tracking) EDGE goalie details.
 *
 * @example await client.edge.catGoalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export async function catGoalieDetail(
  ctx: Context,
  params: EdgePlayerParams,
): Promise<CatGoalieDetail> {
  return getEdge(ctx, 'cat/edge/goalie-detail', params.playerId, params);
}

// ========================
// TEAM ENDPOINTS
// ========================

/**
 * Get NHL EDGE team detail statistics for a specific team.
 *
 * @example await client.edge.teamDetail({ teamId: 10 })
 */
export async function teamDetail(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamDetail> {
  return getEdge(ctx, 'edge/team-detail', params.teamId, params);
}

/**
 * Get NHL EDGE skating distance details for a specific team.
 *
 * @example await client.edge.teamSkatingDistanceDetail({ teamId: 10 })
 */
export async function teamSkatingDistanceDetail(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamSkatingDistanceDetail> {
  return getEdge(
    ctx,
    'edge/team-skating-distance-detail',
    params.teamId,
    params,
  );
}

/**
 * Get NHL EDGE zone time details for a specific team.
 *
 * @example await client.edge.teamZoneTimeDetails({ teamId: 10 })
 */
export async function teamZoneTimeDetails(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamZoneTimeDetails> {
  return getEdge(ctx, 'edge/team-zone-time-details', params.teamId, params);
}

/**
 * Get NHL EDGE shot location details for a specific team.
 *
 * @example await client.edge.teamShotLocationDetail({ teamId: 10 })
 */
export async function teamShotLocationDetail(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamShotLocationDetail> {
  return getEdge(ctx, 'edge/team-shot-location-detail', params.teamId, params);
}

/**
 * Get NHL EDGE team landing page data.
 *
 * @example await client.edge.teamLanding({ season: '20232024' })
 */
export async function teamLanding(
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<TeamLanding> {
  return getEdge(ctx, 'edge/team-landing', undefined, params);
}

/**
 * Get NHL EDGE shot speed details for a specific team.
 *
 * @example await client.edge.teamShotSpeedDetail({ teamId: 10 })
 */
export async function teamShotSpeedDetail(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamShotSpeedDetail> {
  return getEdge(ctx, 'edge/team-shot-speed-detail', params.teamId, params);
}

/**
 * Get NHL EDGE skating speed details for a specific team.
 *
 * @example await client.edge.teamSkatingSpeedDetail({ teamId: 10 })
 */
export async function teamSkatingSpeedDetail(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamSkatingSpeedDetail> {
  return getEdge(ctx, 'edge/team-skating-speed-detail', params.teamId, params);
}

// ========================
// LEADERBOARDS (TOP 10)
// ========================

/**
 * Get the NHL EDGE top 10 skaters by skating distance.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.strength 'all' (default), 'es', 'pp' or 'pk'
 * @param params.sortBy 'total', 'per-60', 'max-game' or 'max-period'
 * @example https://api-web.nhle.com/v1/edge/skater-distance-top-10/all/all/total/20252026/2
 */
export async function skaterDistanceTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    strength = EdgeStrengths.ALL,
    sortBy,
    ...params
  }: EdgeStrengthTop10Params<EdgeSkatingDistanceSortBy>,
): Promise<SkaterDistanceTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/skater-distance-top-10',
    [positions, strength, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 skaters by skating speed.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.sortBy 'max', 'over-22', '20-22' or '18-20' (bursts in mph)
 * @example https://api-web.nhle.com/v1/edge/skater-speed-top-10/all/max/20252026/2
 */
export async function skaterSpeedTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    ...params
  }: EdgePositionTop10Params<EdgeSkatingSpeedSortBy>,
): Promise<SkaterSpeedTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/skater-speed-top-10',
    [positions, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 skaters by zone time.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.strength 'all' (default), 'es', 'pp' or 'pk'
 * @param params.sortBy Zone: 'offensive', 'neutral' or 'defensive'. See `EdgeZones`.
 * @example https://api-web.nhle.com/v1/edge/skater-zone-time-top-10/all/all/offensive/20252026/2
 */
export async function skaterZoneTimeTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    strength = EdgeStrengths.ALL,
    sortBy,
    ...params
  }: EdgeStrengthTop10Params<EdgeZone>,
): Promise<SkaterZoneTimeTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/skater-zone-time-top-10',
    [positions, strength, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 skaters by shot speed.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.sortBy 'max', 'over-100', '90-99', '80-89' or '70-79' (attempts in mph)
 * @example https://api-web.nhle.com/v1/edge/skater-shot-speed-top-10/all/max/20252026/2
 */
export async function skaterShotSpeedTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    ...params
  }: EdgePositionTop10Params<EdgeShotSpeedSortBy>,
): Promise<SkaterShotSpeedTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/skater-shot-speed-top-10',
    [positions, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 skaters by shot location. `sortBy` comes before
 * `category` in the URL (the NHL-API-Reference has them the other way round,
 * which 404s).
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'. 'F' / 'D' are a 404 here.
 * @param params.sortBy 'sog', 'goals' or 'shooting-pctg'
 * @param params.category 'all' (default), 'high', 'mid' or 'long'
 * @example https://api-web.nhle.com/v1/edge/skater-shot-location-top-10/all/sog/all/20252026/2
 */
export async function skaterShotLocationTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    category = 'all',
    ...params
  }: EdgeShotLocationTop10Params,
): Promise<SkaterShotLocationTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/skater-shot-location-top-10',
    [positions, sortBy, category],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 goalies by 5v5 performance.
 *
 * @param params.sortBy 'save-pctg', 'save-pctg-close', 'shots' or 'shots-per-60'
 * @example https://api-web.nhle.com/v1/edge/goalie-5v5-top-10/save-pctg/20252026/2
 */
export async function goalie5v5Top10(
  ctx: Context,
  { sortBy, ...params }: EdgeTop10Params<EdgeGoalie5v5SortBy>,
): Promise<Goalie5v5Top10Row[]> {
  return getEdgeSegments(ctx, 'edge/goalie-5v5-top-10', [sortBy], params);
}

/**
 * Get the NHL EDGE top 10 goalies by shot location.
 *
 * @param params.sortBy 'save-pctg', 'saves', 'goals-against' or 'shots-against'
 * @param params.category 'all' (default), 'high', 'mid' or 'long'
 * @example https://api-web.nhle.com/v1/edge/goalie-shot-location-top-10/save-pctg/all/20252026/2
 */
export async function goalieShotLocationTop10(
  ctx: Context,
  { sortBy, category = 'all', ...params }: EdgeGoalieShotLocationTop10Params,
): Promise<GoalieShotLocationTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/goalie-shot-location-top-10',
    [sortBy, category],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 goalies by games above a .900 save percentage.
 *
 * @param params.sortBy 'games' (count) or 'pctg' (share of games played)
 * @example https://api-web.nhle.com/v1/edge/goalie-edge-save-pctg-top-10/games/20252026/2
 */
export async function goalieSavePercentageTop10(
  ctx: Context,
  { sortBy, ...params }: EdgeTop10Params<EdgeGoalieSavePercentageSortBy>,
): Promise<GoalieSavePercentageTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/goalie-edge-save-pctg-top-10',
    [sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 teams by skating distance.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.strength 'all' (default), 'es', 'pp' or 'pk'
 * @param params.sortBy 'total', 'per-60', 'max-game' or 'max-period'
 * @example https://api-web.nhle.com/v1/edge/team-skating-distance-top-10/all/all/total/20252026/2
 */
export async function teamSkatingDistanceTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    strength = EdgeStrengths.ALL,
    sortBy,
    ...params
  }: EdgeStrengthTop10Params<EdgeSkatingDistanceSortBy>,
): Promise<TeamSkatingDistanceTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/team-skating-distance-top-10',
    [positions, strength, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 teams by skating speed.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.sortBy 'max', 'over-22', '20-22' or '18-20' (bursts in mph)
 * @example https://api-web.nhle.com/v1/edge/team-skating-speed-top-10/all/max/20252026/2
 */
export async function teamSkatingSpeedTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    ...params
  }: EdgePositionTop10Params<EdgeSkatingSpeedSortBy>,
): Promise<TeamSkatingSpeedTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/team-skating-speed-top-10',
    [positions, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 teams by zone time. There is no `positions` slot.
 *
 * @param params.strength 'all' (default), 'es', 'pp' or 'pk'
 * @param params.sortBy Zone: 'offensive', 'neutral' or 'defensive'. See `EdgeZones`.
 * @example https://api-web.nhle.com/v1/edge/team-zone-time-top-10/es/offensive/20242025/2
 */
export async function teamZoneTimeTop10(
  ctx: Context,
  {
    strength = EdgeStrengths.ALL,
    sortBy,
    ...params
  }: EdgeTeamZoneTimeTop10Params,
): Promise<TeamZoneTimeTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/team-zone-time-top-10',
    [strength, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 teams by shot speed.
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'
 * @param params.sortBy 'max', 'over-100', '90-99', '80-89' or '70-79' (attempts in mph)
 * @example https://api-web.nhle.com/v1/edge/team-shot-speed-top-10/all/max/20252026/2
 */
export async function teamShotSpeedTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    ...params
  }: EdgePositionTop10Params<EdgeShotSpeedSortBy>,
): Promise<TeamShotSpeedTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/team-shot-speed-top-10',
    [positions, sortBy],
    params,
  );
}

/**
 * Get the NHL EDGE top 10 teams by shot location. `sortBy` comes before
 * `category` in the URL (the NHL-API-Reference has them the other way round,
 * which 404s).
 *
 * @param params.positions 'all' (default), 'forwards' or 'defense'. 'F' / 'D' are a 404 here.
 * @param params.sortBy 'sog', 'goals' or 'shooting-pctg'
 * @param params.category 'all' (default), 'high', 'mid' or 'long'
 * @example https://api-web.nhle.com/v1/edge/team-shot-location-top-10/all/sog/all/20252026/2
 */
export async function teamShotLocationTop10(
  ctx: Context,
  {
    positions = EdgePositions.ALL,
    sortBy,
    category = 'all',
    ...params
  }: EdgeShotLocationTop10Params,
): Promise<TeamShotLocationTop10Row[]> {
  return getEdgeSegments(
    ctx,
    'edge/team-shot-location-top-10',
    [positions, sortBy, category],
    params,
  );
}

/**
 * Get the NHL EDGE comparison statistics for a specific team.
 *
 * @param params.teamId NHL team id, e.g. 10
 * @example await client.edge.teamComparison({ teamId: 10 })
 */
export async function teamComparison(
  ctx: Context,
  params: EdgeTeamParams,
): Promise<TeamComparison> {
  return getEdge(ctx, 'edge/team-comparison', params.teamId, params);
}

// ========================
// LEAGUE ENDPOINTS
// ========================

/**
 * Get the NHL EDGE "by the numbers" league highlights. Without a season this
 * is the latest game night (`games`, `gameDate` and the nightly leaders);
 * with a season it is the season bests (hardest shot, top speed, longest
 * distance in a game).
 *
 * @example https://api-web.nhle.com/v1/edge/by-the-numbers/now
 */
export async function byTheNumbers(
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<ByTheNumbers> {
  return getEdge(ctx, 'edge/by-the-numbers', undefined, params);
}

export const edgeApi = {
  skaterDetail,
  skaterShotSpeedDetail,
  skaterSkatingSpeedDetail,
  skaterShotLocationDetail,
  skaterSkatingDistanceDetail,
  skaterComparison,
  skaterZoneTime,
  skaterLanding,
  catSkaterDetail,
  goalieDetail,
  goalieShotLocationDetail,
  goalie5v5Detail,
  goalieComparison,
  goalieSavePercentageDetail,
  goalieLanding,
  catGoalieDetail,
  teamDetail,
  teamSkatingDistanceDetail,
  teamZoneTimeDetails,
  teamShotLocationDetail,
  teamLanding,
  teamShotSpeedDetail,
  teamSkatingSpeedDetail,
  skaterDistanceTop10,
  skaterSpeedTop10,
  skaterZoneTimeTop10,
  skaterShotSpeedTop10,
  skaterShotLocationTop10,
  goalie5v5Top10,
  goalieShotLocationTop10,
  goalieSavePercentageTop10,
  teamSkatingDistanceTop10,
  teamSkatingSpeedTop10,
  teamZoneTimeTop10,
  teamShotSpeedTop10,
  teamShotLocationTop10,
  teamComparison,
  byTheNumbers,
} as const;
