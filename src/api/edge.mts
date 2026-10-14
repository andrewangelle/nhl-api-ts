import { Endpoint, type HttpClient } from '#src/http-client.mjs';
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

/** NHL EDGE (puck and player tracking) statistics. */
export class Edge {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  private async getEdge(
    path: string,
    id: Id | undefined,
    params: EdgeSeasonParams,
  ): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_WEB_V1, edgeResource(path, id, params))
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
  async skaterDetail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/skater-detail', params.playerId, params);
  }

  /**
   * Get NHL EDGE shot speed details for a specific skater.
   *
   * @example await client.edge.skaterShotSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async skaterShotSpeedDetail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge(
      'edge/skater-shot-speed-detail',
      params.playerId,
      params,
    );
  }

  /**
   * Get NHL EDGE skating speed details for a specific skater.
   *
   * @example await client.edge.skaterSkatingSpeedDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async skaterSkatingSpeedDetail(
    params: EdgePlayerParams,
  ): Promise<JsonObject> {
    return this.getEdge(
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
  async skaterShotLocationDetail(
    params: EdgePlayerParams,
  ): Promise<JsonObject> {
    return this.getEdge(
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
  async skaterSkatingDistanceDetail(
    params: EdgePlayerParams,
  ): Promise<JsonObject> {
    return this.getEdge(
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
  async skaterComparison(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/skater-comparison', params.playerId, params);
  }

  /**
   * Get NHL EDGE zone time details for a specific skater.
   *
   * @example await client.edge.skaterZoneTime({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async skaterZoneTime(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/skater-zone-time', params.playerId, params);
  }

  /**
   * Get NHL EDGE skater landing page data.
   *
   * @example await client.edge.skaterLanding({ season: '20232024' })
   */
  async skaterLanding(params: EdgeSeasonParams = {}): Promise<JsonObject> {
    return this.getEdge('edge/skater-landing', undefined, params);
  }

  /**
   * Get NHL CAT (Catch All Tracking) EDGE skater details.
   *
   * @example await client.edge.catSkaterDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async catSkaterDetail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('cat/edge/skater-detail', params.playerId, params);
  }

  // ========================
  // GOALIE ENDPOINTS
  // ========================

  /**
   * Get NHL EDGE goalie detail statistics for a specific player.
   *
   * @example await client.edge.goalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async goalieDetail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/goalie-detail', params.playerId, params);
  }

  /**
   * Get NHL EDGE shot location details for a specific goalie.
   *
   * @example await client.edge.goalieShotLocationDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async goalieShotLocationDetail(
    params: EdgePlayerParams,
  ): Promise<JsonObject> {
    return this.getEdge(
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
  async goalie5v5Detail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/goalie-5v5-detail', params.playerId, params);
  }

  /**
   * Get NHL EDGE comparison statistics for a specific goalie.
   *
   * @example await client.edge.goalieComparison({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async goalieComparison(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('edge/goalie-comparison', params.playerId, params);
  }

  /**
   * Get NHL EDGE save percentage details for a specific goalie.
   *
   * @example await client.edge.goalieSavePercentageDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async goalieSavePercentageDetail(
    params: EdgePlayerParams,
  ): Promise<JsonObject> {
    return this.getEdge(
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
  async goalieLanding(params: EdgeSeasonParams = {}): Promise<JsonObject> {
    return this.getEdge('edge/goalie-landing', undefined, params);
  }

  /**
   * Get NHL CAT (Catch All Tracking) EDGE goalie details.
   *
   * @example await client.edge.catGoalieDetail({ playerId: 8478402, season: '20232024', gameType: 2 })
   */
  async catGoalieDetail(params: EdgePlayerParams): Promise<JsonObject> {
    return this.getEdge('cat/edge/goalie-detail', params.playerId, params);
  }

  // ========================
  // TEAM ENDPOINTS
  // ========================

  /**
   * Get NHL EDGE team detail statistics for a specific team.
   *
   * @example await client.edge.teamDetail({ teamId: 10 })
   */
  async teamDetail(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge('edge/team-detail', params.teamId, params);
  }

  /**
   * Get NHL EDGE skating distance details for a specific team.
   *
   * @example await client.edge.teamSkatingDistanceDetail({ teamId: 10 })
   */
  async teamSkatingDistanceDetail(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge(
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
  async teamZoneTimeDetails(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge('edge/team-zone-time-details', params.teamId, params);
  }

  /**
   * Get NHL EDGE shot location details for a specific team.
   *
   * @example await client.edge.teamShotLocationDetail({ teamId: 10 })
   */
  async teamShotLocationDetail(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge(
      'edge/team-shot-location-detail',
      params.teamId,
      params,
    );
  }

  /**
   * Get NHL EDGE team landing page data.
   *
   * @example await client.edge.teamLanding({ season: '20232024' })
   */
  async teamLanding(params: EdgeSeasonParams = {}): Promise<JsonObject> {
    return this.getEdge('edge/team-landing', undefined, params);
  }

  /**
   * Get NHL EDGE shot speed details for a specific team.
   *
   * @example await client.edge.teamShotSpeedDetail({ teamId: 10 })
   */
  async teamShotSpeedDetail(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge('edge/team-shot-speed-detail', params.teamId, params);
  }

  /**
   * Get NHL EDGE skating speed details for a specific team.
   *
   * @example await client.edge.teamSkatingSpeedDetail({ teamId: 10 })
   */
  async teamSkatingSpeedDetail(params: EdgeTeamParams): Promise<JsonObject> {
    return this.getEdge(
      'edge/team-skating-speed-detail',
      params.teamId,
      params,
    );
  }
}
