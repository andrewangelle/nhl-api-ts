import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

export class GameCenter {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  private async getWeb(resource: string): Promise<JsonObject> {
    return (await this.client.get(Endpoint.API_WEB_V1, resource)).json();
  }

  /**
   * Get the full boxscore for a specific NHL game, including team scores,
   * shots on goal, and per-player stats.
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @example https://api-web.nhle.com/v1/gamecenter/2023020280/boxscore
   */
  async boxscore({ gameId }: { gameId: Id }): Promise<JsonObject> {
    return this.getWeb(`gamecenter/${gameId}/boxscore`);
  }

  /**
   * Get the full play-by-play feed for a specific NHL game, containing every
   * recorded event (shots, hits, faceoffs, goals, penalties...).
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @example https://api-web.nhle.com/v1/gamecenter/2023020280/play-by-play
   */
  async playByPlay({ gameId }: { gameId: Id }): Promise<JsonObject> {
    return this.getWeb(`gamecenter/${gameId}/play-by-play`);
  }

  /**
   * Get the landing-page summary for a specific NHL game, including scoring by
   * period, three stars and penalties.
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @example https://api-web.nhle.com/v1/gamecenter/2023020280/landing
   */
  async matchUp({ gameId }: { gameId: Id }): Promise<JsonObject> {
    return this.getWeb(`gamecenter/${gameId}/landing`);
  }

  /**
   * Get scores and game states for all NHL games on a given date. Returns the
   * current day's scores when no date is supplied.
   *
   * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
   * @example https://api-web.nhle.com/v1/score/2023-10-15
   */
  async dailyScores({ date }: { date?: string } = {}): Promise<JsonObject> {
    return this.getWeb(`score/${date ? date : 'now'}`);
  }

  /**
   * Get individual player shift data for a specific game, including start/end
   * times and durations.
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @param params.excludes Fields to exclude from the response. Defaults to ["eventDetails"].
   * @example https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId=2023020280 and ...
   */
  async shiftChartData({
    gameId,
    excludes = ['eventDetails'],
  }: {
    gameId: Id;
    excludes?: string[];
  }): Promise<JsonObject> {
    const excludeP = excludes.join(',');
    const exprP = `gameId=${gameId} and ((duration != '00:00' and typeCode = 517) or typeCode != 517 )`;
    return (
      await this.client.get(
        Endpoint.API_STATS,
        `en/shiftcharts?cayenneExp=${exprP}&exclude=${excludeP}`,
      )
    ).json();
  }

  /**
   * Get the season-series record and contextual stats for a specific game,
   * including team season stats and last games.
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @example https://api-web.nhle.com/v1/gamecenter/2023020280/right-rail
   */
  async seasonSeriesMatchup({ gameId }: { gameId: Id }): Promise<JsonObject> {
    return this.getWeb(`gamecenter/${gameId}/right-rail`);
  }

  /**
   * Get the narrative game story for a specific game, including scoring
   * summaries, three stars and team game stats.
   *
   * @param params.gameId Game id, e.g. 2023020280
   * @example https://api-web.nhle.com/v1/wsc/game-story/2023020280
   */
  async gameStory({ gameId }: { gameId: Id }): Promise<JsonObject> {
    return this.getWeb(`wsc/game-story/${gameId}`);
  }
}
