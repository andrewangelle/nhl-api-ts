import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

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
export const leagueStandings = async (
  ctx: Context,
  { date, season }: { date?: string; season?: Id } = {},
): Promise<JsonObject> => {
  if (season) {
    const seasons = await seasonStandingManifest(ctx);
    const seasonData = seasons.find(
      (seasonEntry) => seasonEntry.id === Number(season),
    );
    if (!seasonData) {
      throw new RangeError(`Invalid Season Id ${season}`);
    }
    date = seasonData.standingsEnd;
  }

  const res = date ? date : 'now';
  return (await ctx.get(Endpoint.API_WEB_V1, `standings/${res}`)).json();
};

/**
 * Gets metadata for every historical NHL season: start/end dates and which
 * standings rules (conferences, divisions, wildcard, ties...) were in use.
 *
 * @example https://api-web.nhle.com/v1/standings-season
 */
export const seasonStandingManifest = async (
  ctx: Context,
): Promise<JsonObject[]> => {
  const response = await (
    await ctx.get(Endpoint.API_WEB_V1, 'standings-season')
  ).json();
  return response.seasons ?? [];
};

export const standingsApi = {
  leagueStandings,
  seasonStandingManifest,
} as const;
