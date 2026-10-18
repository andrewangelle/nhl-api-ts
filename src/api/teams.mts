import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { Franchise, Roster, StandingsEntry } from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

export interface Team {
  conference: { abbr: string; name: string };
  division: { abbr: string; name: string };
  name: string;
  common_name: string;
  abbr: string;
  logo: string;
  franchise_id?: number;
}

async function fetchStandingsData(
  ctx: Context,
  date: string,
): Promise<StandingsEntry[]> {
  const response = await (
    await ctx.get(Endpoint.API_WEB_V1, `standings/${date}`)
  ).json();
  return response.standings ?? [];
}

/** Converts a raw standings entry into a `Team`. */
export function toTeam(teamData: Partial<StandingsEntry>): Team {
  function nestedDefault(
    key: 'teamName' | 'teamCommonName' | 'teamAbbrev',
  ): string {
    return teamData[key]?.default ?? '';
  }
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

/**
 * Adds a `franchise_id` to each team that has a matching franchise. Teams
 * without a match are returned unchanged (no `franchise_id` key).
 */
export function withFranchiseIds(
  teams: readonly Team[],
  franchises: readonly Pick<Franchise, 'id' | 'fullName'>[],
): Team[] {
  const lookup = new Map<string, number>();
  for (const franchise of franchises) {
    const fullName = franchise.fullName ?? '';
    const franchiseId = franchise.id;
    if (fullName && franchiseId) {
      lookup.set(fullName, franchiseId);
    }
  }

  return teams.map((team) => {
    const franchiseId = findFranchiseId(team.name ?? '', lookup);
    return franchiseId ? { ...team, franchise_id: franchiseId } : { ...team };
  });
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
export async function teams(
  ctx: Context,
  { date = 'now' }: { date?: string } = {},
): Promise<Team[]> {
  const standingsData = await fetchStandingsData(ctx, date);
  const franchiseData = await franchises(ctx);
  return withFranchiseIds(standingsData.map(toTeam), franchiseData);
}

/**
 * Get the roster for the given team and season.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @example https://api-web.nhle.com/v1/roster/BUF/20232024
 */
export async function teamRoster(
  ctx: Context,
  { teamAbbr, season }: { teamAbbr: string; season: Id },
): Promise<Roster> {
  return (
    await ctx.get(Endpoint.API_WEB_V1, `roster/${teamAbbr}/${season}`)
  ).json();
}

/**
 * Get a list of all past and current NHL franchises.
 *
 * @example https://api.nhle.com/stats/rest/en/franchise
 */
export async function franchises(ctx: Context): Promise<Franchise[]> {
  const response = await (
    await ctx.get(Endpoint.API_STATS, 'en/franchise')
  ).json();
  return response.data ?? [];
}

export const teamsApi = { teams, teamRoster, franchises } as const;
