import { andClauses, cayenneString } from '#src/api/query/cayenne.mjs';
import { normalizeDate } from '#src/api/schedule.mjs';
import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  ComponentSeason,
  Country,
  DraftYear,
  GeoLocation,
  GlossaryEntry,
  Meta,
  PartnerGameOdds,
  PostalLookupTeam,
  SeasonId,
  SeasonRules,
  StatsConfig,
  StatsGame,
  TvSchedule,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

async function getData<Row>(
  ctx: Context,
  resource: string,
  queryParams?: Record<string, string>,
): Promise<Row[]> {
  const response = await (
    await ctx.get(Endpoint.API_CORE, resource, queryParams)
  ).json();
  return response.data ?? [];
}

async function getWeb<Body>(ctx: Context, resource: string): Promise<Body> {
  return (await ctx.get(Endpoint.API_WEB_V1, resource)).json();
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

/**
 * Gets the season and game type the stats API currently serves by default.
 *
 * @example https://api.nhle.com/stats/rest/en/componentSeason
 */
export async function componentSeasons(
  ctx: Context,
): Promise<ComponentSeason[]> {
  return getData(ctx, 'stats/rest/en/componentSeason');
}

export interface GamesParams {
  /** Season in YYYYYYYY format, e.g. 20232024 (about 1,500 games). */
  season?: Id;
  /** 1=Preseason, 2=Regular season, 3=Playoffs. */
  gameType?: number;
  /** NHL team id, home or away, e.g. 10. */
  teamId?: Id;
  /** First game date, YYYY-MM-DD (inclusive). */
  startDate?: string;
  /** Last game date, YYYY-MM-DD (inclusive). */
  endDate?: string;
  /**
   * Extra filter expression, joined to the others with `and`. Only the row
   * fields (`season`, `gameType`, `gameDate`, `homeTeamId`, ...) can be
   * filtered; report columns like `seasonId` are a 400.
   */
  cayenneExp?: string;
}

function gamesClauses({
  season,
  gameType,
  teamId,
  startDate,
  endDate,
  cayenneExp,
}: GamesParams): string[] {
  const clauses: string[] = [];
  if (season !== undefined && season !== null) {
    clauses.push(`season=${season}`);
  }
  if (gameType !== undefined) {
    clauses.push(`gameType=${gameType}`);
  }
  if (teamId !== undefined && teamId !== null) {
    clauses.push(`homeTeamId=${teamId} or visitingTeamId=${teamId}`);
  }
  if (startDate !== undefined) {
    clauses.push(`gameDate>=${cayenneString(normalizeDate(startDate))}`);
  }
  if (endDate !== undefined) {
    clauses.push(`gameDate<=${cayenneString(normalizeDate(endDate))}`);
  }
  if (cayenneExp?.trim()) {
    clauses.push(cayenneExp);
  }
  return clauses;
}

/**
 * Gets games from the stats API. At least one filter is required:
 * unfiltered, the API sends every game ever played (about 19 MB).
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @param params.gameType 1=Preseason, 2=Regular season, 3=Playoffs
 * @param params.teamId NHL team id, home or away, e.g. 10
 * @param params.startDate First game date, YYYY-MM-DD
 * @param params.endDate Last game date, YYYY-MM-DD
 * @param params.cayenneExp Extra filter expression, e.g. "homeScore>=7"
 * @throws RangeError When no filter is given, or a date is not YYYY-MM-DD
 * @example await client.misc.games({ season: 20232024, teamId: 10, gameType: 3 })
 */
export async function games(
  ctx: Context,
  params: GamesParams,
): Promise<StatsGame[]> {
  const clauses = gamesClauses(params);
  if (clauses.length === 0) {
    throw new RangeError(
      'Missing filter. Pass season, gameType, teamId, a date or cayenneExp.',
    );
  }
  return getData(ctx, 'stats/rest/en/game', {
    cayenneExp: andClauses(clauses),
  });
}

/**
 * Gets the national TV schedule for the week around a date, grouped by date.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/network/tv-schedule/2023-10-15
 */
export async function tvSchedule(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<TvSchedule> {
  return getWeb(ctx, `network/tv-schedule/${date ?? 'now'}`);
}

/**
 * Gets betting odds for today's games from the NHL's odds partner in a
 * country.
 *
 * @experimental Feeds an nhl.com widget; the shape may change without notice.
 * @param params.countryCode Two-letter country code, e.g. US, CA
 * @example https://api-web.nhle.com/v1/partner-game/US/now
 */
export async function partnerGameOdds(
  ctx: Context,
  { countryCode }: { countryCode: string },
): Promise<PartnerGameOdds> {
  return getWeb(ctx, `partner-game/${countryCode}/now`);
}

/**
 * Gets every NHL season id, oldest first.
 *
 * @example https://api-web.nhle.com/v1/season
 */
export async function seasonIds(ctx: Context): Promise<SeasonId[]> {
  return getWeb(ctx, 'season');
}

/**
 * Gets display metadata (names, headshots, logos) for players and teams.
 * Lists you leave out or pass empty come back empty.
 *
 * @param params.players Player ids, e.g. [8478402]
 * @param params.teams Team abbreviations, e.g. ['TOR', 'BUF']
 * @example https://api-web.nhle.com/v1/meta?players=8478402&teams=TOR,BUF
 */
export async function meta(
  ctx: Context,
  { players = [], teams = [] }: { players?: Id[]; teams?: string[] } = {},
): Promise<Meta> {
  const query: Record<string, string> = {};
  if (players.length > 0) {
    query.players = players.join(',');
  }
  if (teams.length > 0) {
    query.teams = teams.join(',');
  }
  return (await ctx.get(Endpoint.API_WEB_V1, 'meta', query)).json();
}

/**
 * Gets the caller's country, looked up from their IP address. The answer
 * depends on where the request comes from.
 *
 * @experimental Feeds an nhl.com widget; the shape may change without notice.
 * @example https://api-web.nhle.com/v1/location
 */
export async function location(ctx: Context): Promise<GeoLocation> {
  return getWeb(ctx, 'location');
}

/**
 * Gets the teams whose local broadcast market covers a postal code. Empty
 * for codes outside every market.
 *
 * @experimental Feeds an nhl.com widget; the shape may change without notice.
 * @param params.postalCode Postal or ZIP code, e.g. 90210 or "M5V 3L9"
 * @example https://api-web.nhle.com/v1/postal-lookup/90210
 */
export async function postalLookup(
  ctx: Context,
  { postalCode }: { postalCode: string },
): Promise<PostalLookupTeam[]> {
  return getWeb(ctx, `postal-lookup/${encodeURIComponent(postalCode)}`);
}

/**
 * Checks that the stats API is up. Resolves `true` on success; it never
 * resolves `false`, since any failure throws an `NHLApiException` subclass
 * (or a network error).
 *
 * @throws ServerErrorException When the stats API answers 5xx
 * @example https://api.nhle.com/stats/rest/ping
 */
export async function ping(ctx: Context): Promise<true> {
  await ctx.get(Endpoint.API_CORE, 'stats/rest/ping');
  return true;
}

export const miscApi = {
  glossary,
  config,
  countries,
  seasonSpecificRulesAndInfo,
  draftYearAndRounds,
  componentSeasons,
  games,
  tvSchedule,
  partnerGameOdds,
  seasonIds,
  meta,
  location,
  postalLookup,
  ping,
} as const;
