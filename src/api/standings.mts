import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

export class Standings {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  /**
   * Gets NHL league standings for a specific date or season.
   *
   * If `season` is given, the standings from the end of that season are
   * returned (overrides `date`). Otherwise standings for `date` or today.
   *
   * @param params.date Date in YYYY-MM-DD format
   * @param params.season Season in YYYYYYYY format, e.g. 20222023
   * @throws RangeError If the season id is not found in the standings manifest
   * @example await client.standings.leagueStandings({ season: '20222023' })
   */
  async leagueStandings({
    date,
    season,
  }: {
    date?: string;
    season?: Id;
  } = {}): Promise<JsonObject> {
    if (season) {
      const seasons = await this.seasonStandingManifest();
      const seasonData = seasons.find((s) => s.id === Number(season));
      if (!seasonData) {
        throw new RangeError(`Invalid Season Id ${season}`);
      }
      date = seasonData.standingsEnd;
    }

    const res = date ? date : 'now';
    return (
      await this.client.get(Endpoint.API_WEB_V1, `standings/${res}`)
    ).json();
  }

  /**
   * Gets metadata for every historical NHL season: start/end dates and which
   * standings rules (conferences, divisions, wildcard, ties...) were in use.
   *
   * @example https://api-web.nhle.com/v1/standings-season
   */
  async seasonStandingManifest(): Promise<JsonObject[]> {
    const response = await (
      await this.client.get(Endpoint.API_WEB_V1, 'standings-season')
    ).json();
    return response.seasons ?? [];
  }
}
