import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

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

/** "<path>/<id>/now" when no season is given, else "<path>/<id>/<season>/<gameType>". */
function edgeResource(
  path: string,
  id: Id | undefined,
  { season, gameType = 2 }: EdgeSeasonParams,
): string {
  const base = id === undefined ? path : `${path}/${id}`;
  if (season === undefined || season === null) {
    return `${base}/now`;
  }
  return `${base}/${season}/${gameType}`;
}

async function getEdge(
  ctx: Context,
  path: string,
  id: Id | undefined,
  params: EdgeSeasonParams,
): Promise<JsonObject> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, edgeResource(path, id, params))
  ).json();
}

// ========================
// SKATER ENDPOINTS
// ========================

/**
 * Get NHL EDGE skater detail statistics for a specific player.
 *
 * @example await client.edge.skaterDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-detail', params.playerId, params);

/**
 * Get NHL EDGE shot speed details for a specific skater.
 *
 * @example await client.edge.skaterShotSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterShotSpeedDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-shot-speed-detail', params.playerId, params);

/**
 * Get NHL EDGE skating speed details for a specific skater.
 *
 * @example await client.edge.skaterSkatingSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterSkatingSpeedDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-skating-speed-detail', params.playerId, params);

/**
 * Get NHL EDGE shot location details for a specific skater.
 *
 * @example await client.edge.skaterShotLocationDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterShotLocationDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-shot-location-detail', params.playerId, params);

/**
 * Get NHL EDGE skating distance details for a specific skater.
 *
 * @example await client.edge.skaterSkatingDistanceDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterSkatingDistanceDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-skating-distance-detail', params.playerId, params);

/**
 * Get NHL EDGE comparison statistics for a specific skater.
 *
 * @example await client.edge.skaterComparison({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterComparison = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-comparison', params.playerId, params);

/**
 * Get NHL EDGE zone time details for a specific skater.
 *
 * @example await client.edge.skaterZoneTime({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const skaterZoneTime = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-zone-time', params.playerId, params);

/**
 * Get NHL EDGE skater landing page data.
 *
 * @example await client.edge.skaterLanding({ season: '20232024' })
 */
export const skaterLanding = async (
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/skater-landing', undefined, params);

/**
 * Get NHL CAT (Catch All Tracking) EDGE skater details.
 *
 * @example await client.edge.catSkaterDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const catSkaterDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'cat/edge/skater-detail', params.playerId, params);

// ========================
// GOALIE ENDPOINTS
// ========================

/**
 * Get NHL EDGE goalie detail statistics for a specific player.
 *
 * @example await client.edge.goalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const goalieDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-detail', params.playerId, params);

/**
 * Get NHL EDGE shot location details for a specific goalie.
 *
 * @example await client.edge.goalieShotLocationDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const goalieShotLocationDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-shot-location-detail', params.playerId, params);

/**
 * Get NHL EDGE 5v5 performance details for a specific goalie.
 *
 * @example await client.edge.goalie5v5Detail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const goalie5v5Detail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-5v5-detail', params.playerId, params);

/**
 * Get NHL EDGE comparison statistics for a specific goalie.
 *
 * @example await client.edge.goalieComparison({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const goalieComparison = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-comparison', params.playerId, params);

/**
 * Get NHL EDGE save percentage details for a specific goalie.
 *
 * @example await client.edge.goalieSavePercentageDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const goalieSavePercentageDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-save-percentage-detail', params.playerId, params);

/**
 * Get NHL EDGE goalie landing page data.
 *
 * @example await client.edge.goalieLanding({ season: '20232024' })
 */
export const goalieLanding = async (
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/goalie-landing', undefined, params);

/**
 * Get NHL CAT (Catch All Tracking) EDGE goalie details.
 *
 * @example await client.edge.catGoalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
 */
export const catGoalieDetail = async (
  ctx: Context,
  params: EdgePlayerParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'cat/edge/goalie-detail', params.playerId, params);

// ========================
// TEAM ENDPOINTS
// ========================

/**
 * Get NHL EDGE team detail statistics for a specific team.
 *
 * @example await client.edge.teamDetail({ teamId: 10 })
 */
export const teamDetail = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-detail', params.teamId, params);

/**
 * Get NHL EDGE skating distance details for a specific team.
 *
 * @example await client.edge.teamSkatingDistanceDetail({ teamId: 10 })
 */
export const teamSkatingDistanceDetail = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-skating-distance-detail', params.teamId, params);

/**
 * Get NHL EDGE zone time details for a specific team.
 *
 * @example await client.edge.teamZoneTimeDetails({ teamId: 10 })
 */
export const teamZoneTimeDetails = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-zone-time-details', params.teamId, params);

/**
 * Get NHL EDGE shot location details for a specific team.
 *
 * @example await client.edge.teamShotLocationDetail({ teamId: 10 })
 */
export const teamShotLocationDetail = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-shot-location-detail', params.teamId, params);

/**
 * Get NHL EDGE team landing page data.
 *
 * @example await client.edge.teamLanding({ season: '20232024' })
 */
export const teamLanding = async (
  ctx: Context,
  params: EdgeSeasonParams = {},
): Promise<JsonObject> => getEdge(ctx, 'edge/team-landing', undefined, params);

/**
 * Get NHL EDGE shot speed details for a specific team.
 *
 * @example await client.edge.teamShotSpeedDetail({ teamId: 10 })
 */
export const teamShotSpeedDetail = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-shot-speed-detail', params.teamId, params);

/**
 * Get NHL EDGE skating speed details for a specific team.
 *
 * @example await client.edge.teamSkatingSpeedDetail({ teamId: 10 })
 */
export const teamSkatingSpeedDetail = async (
  ctx: Context,
  params: EdgeTeamParams,
): Promise<JsonObject> =>
  getEdge(ctx, 'edge/team-skating-speed-detail', params.teamId, params);

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
} as const;
