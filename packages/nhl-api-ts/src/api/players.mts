import { andClauses, cayenneString } from '#src/api/query/cayenne.mjs';
import {
  filter,
  type PositionTypes,
  toQuery,
} from '#src/api/query/filters.mjs';
import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  PlayerSpotlight,
  Prospects,
  Roster,
  StatsApiPage,
  StatsPlayer,
} from '#src/types/index.mjs';
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

export interface PlayerSearchParams {
  /** Case-insensitive part of the full name, e.g. "matth" or "Ryan O'Reilly". */
  name?: string;
  /** NHL team id of the player's current team, e.g. 10. */
  teamId?: Id;
  /** Position. `F` matches every forward (C, L, R). */
  position?: PositionTypes | 'G';
  /**
   * Extra filter expression, joined to the others with `and`. Only the row
   * fields (`id`, `firstName`, `lastName`, `fullName`, `currentTeamId`,
   * `positionCode`, `sweaterNumber`) can be filtered; anything else is a 400.
   */
  cayenneExp?: string;
  /** Field to sort by, e.g. "lastName". */
  sort?: string;
  /** Sort direction for `sort`. */
  dir?: 'ASC' | 'DESC';
  /** Pagination offset. The API returns at most 5 rows per request. */
  start?: number;
  /** Only return these fields. Rows then hold just these keys. */
  include?: readonly string[];
  /** Leave out these fields. */
  exclude?: readonly string[];
}

function playerSearchClauses({
  name,
  teamId,
  position,
  cayenneExp,
}: PlayerSearchParams): string[] {
  const clauses: string[] = [];
  if (name?.trim()) {
    clauses.push(
      `fullName likeIgnoreCase ${cayenneString(`%${name.trim()}%`)}`,
    );
  }
  if (teamId !== undefined && teamId !== null) {
    clauses.push(`currentTeamId=${teamId}`);
  }
  if (position !== undefined) {
    clauses.push(
      position === 'G'
        ? "positionCode='G'"
        : toQuery(filter.position(position)),
    );
  }
  if (cayenneExp?.trim()) {
    clauses.push(cayenneExp);
  }
  return clauses;
}

/**
 * Searches every player on record, past and present. Returns the full page
 * (`{ data, total }`): the API sends **at most 5 rows** per request, whatever
 * the limit, so page with `start` until you have `total` rows.
 *
 * @param params.name Case-insensitive part of the full name, e.g. "matth"
 * @param params.teamId NHL team id of the current team, e.g. 10
 * @param params.position C, L, R, D, G, or F for every forward
 * @param params.cayenneExp Extra filter expression, e.g. "sweaterNumber=34"
 * @param params.sort Field to sort by, e.g. "lastName"
 * @param params.dir ASC or DESC
 * @param params.start Pagination offset
 * @param params.include Only return these fields, e.g. ['id', 'fullName']
 * @param params.exclude Leave out these fields
 * @throws RangeError When no filter is given (the API would return no rows)
 * @example await client.players.playerSearch({ name: 'matthews', position: 'C' })
 */
export async function playerSearch(
  ctx: Context,
  params: PlayerSearchParams,
): Promise<StatsApiPage<StatsPlayer>> {
  const { sort, dir, start, include, exclude } = params;
  const clauses = playerSearchClauses(params);
  if (clauses.length === 0) {
    throw new RangeError(
      'Missing filter. Pass name, teamId, position or cayenneExp.',
    );
  }
  const query: Record<string, string | number | readonly string[]> = {
    cayenneExp: andClauses(clauses),
  };
  if (sort !== undefined) {
    query.sort = sort;
  }
  if (dir !== undefined) {
    query.dir = dir;
  }
  if (start !== undefined) {
    query.start = start;
  }
  if (include && include.length > 0) {
    query.include = include;
  }
  if (exclude && exclude.length > 0) {
    query.exclude = exclude;
  }
  return (await ctx.get(Endpoint.API_STATS, 'en/players', query)).json();
}

export const playersApi = {
  prospectsByTeam,
  playersByTeam,
  playerSpotlight,
  playerSearch,
} as const;
