import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  Country,
  DraftYear,
  GlossaryEntry,
  SeasonRules,
  StatsConfig,
} from '#src/types/index.mjs';

async function getData<Row>(ctx: Context, resource: string): Promise<Row[]> {
  const response = await (await ctx.get(Endpoint.API_CORE, resource)).json();
  return response.data ?? [];
}

/**
 * Gets the full NHL glossary of statistical terms and abbreviations.
 *
 * @example https://api.nhle.com/stats/rest/en/glossary?sort=fullName
 */
export async function glossary(ctx: Context): Promise<GlossaryEntry[]> {
  return getData(ctx, 'stats/rest/en/glossary?sort=fullName');
}

/**
 * Gets the stats API configuration, including available report types and
 * filters.
 *
 * @example https://api.nhle.com/stats/rest/en/config
 */
export async function config(ctx: Context): Promise<StatsConfig> {
  return (await ctx.get(Endpoint.API_CORE, 'stats/rest/en/config')).json();
}

/**
 * Gets the list of countries recognized by the NHL.
 *
 * @example https://api.nhle.com/stats/rest/en/country
 */
export async function countries(ctx: Context): Promise<Country[]> {
  return getData(ctx, 'stats/rest/en/country');
}

/**
 * Gets rules and metadata for every NHL season on record.
 *
 * @example https://api.nhle.com/stats/rest/en/season
 */
export async function seasonSpecificRulesAndInfo(
  ctx: Context,
): Promise<SeasonRules[]> {
  return getData(ctx, 'stats/rest/en/season');
}

/**
 * Gets the number of rounds for each NHL draft year.
 *
 * @example https://api.nhle.com/stats/rest/en/draft
 */
export async function draftYearAndRounds(ctx: Context): Promise<DraftYear[]> {
  return getData(ctx, 'stats/rest/en/draft');
}

export const miscApi = {
  glossary,
  config,
  countries,
  seasonSpecificRulesAndInfo,
  draftYearAndRounds,
} as const;
