import { Endpoint, type HttpClient } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

export interface Team {
  conference: { abbr: string; name: string };
  division: { abbr: string; name: string };
  name: string;
  common_name: string;
  abbr: string;
  logo: string;
  franchise_id?: number;
}

/** NHL Teams API client. */
export class Teams {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  private async fetchStandingsData(date: string): Promise<JsonObject[]> {
    const response = await (
      await this.client.get(Endpoint.API_WEB_V1, `standings/${date}`)
    ).json();
    return response.standings ?? [];
  }

  private createTeam(teamData: JsonObject): Team {
    const nestedDefault = (key: string): string => teamData[key]?.default ?? '';
    return {
      conference: {
        abbr: teamData.conferenceAbbrev ?? '',
        name: teamData.conferenceName ?? '',
      },
      division: {
        abbr: teamData.divisionAbbrev ?? '',
        name: teamData.divisionName ?? '',
      },
      name: nestedDefault('teamName'),
      common_name: nestedDefault('teamCommonName'),
      abbr: nestedDefault('teamAbbrev'),
      logo: teamData.teamLogo ?? '',
    };
  }

  private async enrichTeamsWithFranchiseIds(teams: Team[]): Promise<void> {
    const lookup = new Map<string, number>();
    for (const franchise of await this.franchises()) {
      const fullName = franchise.fullName ?? '';
      const franchiseId = franchise.id;
      if (fullName && franchiseId) {
        lookup.set(fullName, franchiseId);
      }
    }

    for (const team of teams) {
      const franchiseId = findFranchiseId(team.name ?? '', lookup);
      if (franchiseId) {
        team.franchise_id = franchiseId;
      }
    }
  }

  /**
   * Get a list of all NHL teams with conference, division, and franchise info.
   *
   * Team list is derived from the standings for the given date, then enriched
   * with franchise ids.
   *
   * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
   * @example await client.teams.teams()
   */
  async teams({ date = 'now' }: { date?: string } = {}): Promise<Team[]> {
    const standingsData = await this.fetchStandingsData(date);
    const teams = standingsData.map((t) => this.createTeam(t));
    await this.enrichTeamsWithFranchiseIds(teams);
    return teams;
  }

  /**
   * Get the roster for the given team and season.
   *
   * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @example https://api-web.nhle.com/v1/roster/BUF/20232024
   */
  async teamRoster({
    teamAbbr,
    season,
  }: {
    teamAbbr: string;
    season: Id;
  }): Promise<JsonObject> {
    return (
      await this.client.get(Endpoint.API_WEB_V1, `roster/${teamAbbr}/${season}`)
    ).json();
  }

  /**
   * Get a list of all past and current NHL franchises.
   *
   * @example https://api.nhle.com/stats/rest/en/franchise
   */
  async franchises(): Promise<JsonObject[]> {
    const response = await (
      await this.client.get(Endpoint.API_STATS, 'en/franchise')
    ).json();
    return response.data ?? [];
  }
}

/** Find franchise ID for a team name, with fallbacks for known name mismatches. */
function findFranchiseId(
  teamName: string,
  lookup: Map<string, number>,
): number | undefined {
  if (lookup.has(teamName)) {
    return lookup.get(teamName);
  }

  // "Montreal Canadiens" vs "Montréal Canadiens", Utah's renames, etc.
  for (const partial of ['Canadiens', 'Utah']) {
    if (teamName.includes(partial)) {
      for (const [franchiseName, franchiseId] of lookup) {
        if (franchiseName.includes(partial)) {
          return franchiseId;
        }
      }
      return undefined;
    }
  }
  return undefined;
}
