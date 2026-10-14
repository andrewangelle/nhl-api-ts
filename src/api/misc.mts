import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { JsonObject } from '#src/utils.mjs';

export class Misc {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  private async getData(resource: string): Promise<JsonObject[]> {
    const response = await (
      await this.client.get(Endpoint.API_CORE, resource)
    ).json();
    return response.data ?? [];
  }

  /**
   * Gets the full NHL glossary of statistical terms and abbreviations.
   *
   * @example https://api.nhle.com/stats/rest/en/glossary?sort=fullName
   */
  async glossary(): Promise<JsonObject[]> {
    return this.getData('stats/rest/en/glossary?sort=fullName');
  }

  /**
   * Gets the stats API configuration, including available report types and
   * filters.
   *
   * @example https://api.nhle.com/stats/rest/en/config
   */
  async config(): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_CORE, 'stats/rest/en/config')
    ).json();
  }

  /**
   * Gets the list of countries recognized by the NHL.
   *
   * @example https://api.nhle.com/stats/rest/en/country
   */
  async countries(): Promise<JsonObject[]> {
    return this.getData('stats/rest/en/country');
  }

  /**
   * Gets rules and metadata for every NHL season on record.
   *
   * @example https://api.nhle.com/stats/rest/en/season
   */
  async seasonSpecificRulesAndInfo(): Promise<JsonObject[]> {
    return this.getData('stats/rest/en/season');
  }

  /**
   * Gets the number of rounds for each NHL draft year.
   *
   * @example https://api.nhle.com/stats/rest/en/draft
   */
  async draftYearAndRounds(): Promise<JsonObject[]> {
    return this.getData('stats/rest/en/draft');
  }
}
