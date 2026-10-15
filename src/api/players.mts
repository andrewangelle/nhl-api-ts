import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

/**
 * Gets prospects for a specific team, grouped by position.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @example https://api-web.nhle.com/v1/prospects/BUF
 */
export const prospectsByTeam = async (
  ctx: Context,
  { teamAbbr }: { teamAbbr: string },
): Promise<JsonObject> =>
  (await ctx.get(Endpoint.API_WEB_V1, `prospects/${teamAbbr}`)).json();

/**
 * Gets the roster for a given team and season, grouped by position
 * (forwards, defensemen, goalies). Same data as `teams.teamRoster`.
 *
 * @param params.teamAbbr Team abbreviation, e.g. BUF, TOR
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @example https://api-web.nhle.com/v1/roster/BUF/20232024
 */
export const playersByTeam = async (
  ctx: Context,
  { teamAbbr, season }: { teamAbbr: string; season: Id },
): Promise<JsonObject> =>
  (await ctx.get(Endpoint.API_WEB_V1, `roster/${teamAbbr}/${season}`)).json();

export const playersApi = { prospectsByTeam, playersByTeam } as const;
