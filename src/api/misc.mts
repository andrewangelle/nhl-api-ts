import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type { JsonObject } from '#src/utils.mjs';

async function getData(ctx: Context, resource: string): Promise<JsonObject[]> {
  const response = await (await ctx.get(Endpoint.API_CORE, resource)).json();
  return response.data ?? [];
}

/**
 * Gets the full NHL glossary of statistical terms and abbreviations.
 *
 * @example https://api.nhle.com/stats/rest/en/glossary?sort=fullName
 */
export const glossary = async (ctx: Context): Promise<JsonObject[]> =>
  getData(ctx, 'stats/rest/en/glossary?sort=fullName');

/**
 * Gets the stats API configuration, including available report types and
 * filters.
 *
 * @example https://api.nhle.com/stats/rest/en/config
 */
export const config = async (ctx: Context): Promise<JsonObject> =>
  (await ctx.get(Endpoint.API_CORE, 'stats/rest/en/config')).json();

/**
 * Gets the list of countries recognized by the NHL.
 *
 * @example https://api.nhle.com/stats/rest/en/country
 */
export const countries = async (ctx: Context): Promise<JsonObject[]> =>
  getData(ctx, 'stats/rest/en/country');

/**
 * Gets rules and metadata for every NHL season on record.
 *
 * @example https://api.nhle.com/stats/rest/en/season
 */
export const seasonSpecificRulesAndInfo = async (
  ctx: Context,
): Promise<JsonObject[]> => getData(ctx, 'stats/rest/en/season');

/**
 * Gets the number of rounds for each NHL draft year.
 *
 * @example https://api.nhle.com/stats/rest/en/draft
 */
export const draftYearAndRounds = async (ctx: Context): Promise<JsonObject[]> =>
  getData(ctx, 'stats/rest/en/draft');

export const miscApi = {
  glossary,
  config,
  countries,
  seasonSpecificRulesAndInfo,
  draftYearAndRounds,
} as const;
