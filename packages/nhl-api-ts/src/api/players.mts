import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { PlayerSpotlight, Prospects, Roster } from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

/**
 * Gets prospects for a specific team, grouped by position.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @example https://api-web.nhle.com/v1/prospects/BUF
 */
export async function prospectsByTeam(
  ctx: Context,
  { teamAbbr }: { teamAbbr: string },
): Promise<Prospects> {
  return (await ctx.get(Endpoint.API_WEB_V1, `prospects/${teamAbbr}`)).json();
}

/**
 * Gets the roster for a given team and season, grouped by position
 * (forwards, defensemen, goalies). Same data as `teams.teamRoster`.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.season Season in YYYYYYYY format, e.g. 20232024. Defaults to
 *   the current season (`current`; this endpoint has no `now` alias).
 * @example https://api-web.nhle.com/v1/roster/BUF/20232024
 */
export async function playersByTeam(
  ctx: Context,
  { teamAbbr, season }: { teamAbbr: string; season?: Id },
): Promise<Roster> {
  return (
    await ctx.get(
      Endpoint.API_WEB_V1,
      `roster/${teamAbbr}/${season ?? 'current'}`,
    )
  ).json();
}

/**
 * Gets the players featured in the nhl.com player spotlight.
 *
 * @example https://api-web.nhle.com/v1/player-spotlight
 */
export async function playerSpotlight(
  ctx: Context,
): Promise<PlayerSpotlight[]> {
  return (await ctx.get(Endpoint.API_WEB_V1, 'player-spotlight')).json();
}

export const playersApi = {
  prospectsByTeam,
  playersByTeam,
  playerSpotlight,
} as const;
