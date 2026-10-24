import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  DraftPicks,
  DraftRankings,
  DraftTracker,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

/** Prospect list of the NHL Central Scouting draft rankings. */
export const ProspectCategory = {
  NORTH_AMERICAN_SKATER: 1,
  INTERNATIONAL_SKATER: 2,
  NORTH_AMERICAN_GOALIE: 3,
  INTERNATIONAL_GOALIE: 4,
} as const;

export type ProspectCategory =
  (typeof ProspectCategory)[keyof typeof ProspectCategory];

/** Draft round 1-7, or 'all' for every round. */
export type DraftRound = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'all';

export interface DraftRankingsParams {
  /** Draft year in YYYY format, e.g. 2023. Defaults to the current draft ("now"). */
  season?: Id;
  /** 1=NA skater (default), 2=Intl skater, 3=NA goalie, 4=Intl goalie. Ignored when `season` is omitted. */
  category?: ProspectCategory;
}

export interface DraftPicksParams {
  /** Draft year in YYYY format, e.g. 2023. Defaults to the current draft ("now"). */
  season?: Id;
  /** Round 1-7 or 'all' (default). Ignored when `season` is omitted. */
  round?: DraftRound;
}

function inRange(value: unknown, min: number, max: number): boolean {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

async function getWeb<Body>(ctx: Context, resource: string): Promise<Body> {
  return (await ctx.get(Endpoint.API_WEB_V1, resource)).json();
}

/**
 * Gets the NHL Central Scouting rankings for one prospect category. The API
 * has no season-only route, so `category` defaults to 1 when `season` is
 * given; without `season` the current draft's North American skaters come
 * back and `category` is ignored.
 *
 * @param params.season Draft year in YYYY format (not YYYYYYYY), e.g. 2023. Defaults to "now".
 * @param params.category 1=NA skater, 2=Intl skater, 3=NA goalie, 4=Intl goalie. See `ProspectCategory`.
 * @throws RangeError If `category` is not 1-4
 * @example https://api-web.nhle.com/v1/draft/rankings/2023/1
 */
export async function rankings(
  ctx: Context,
  {
    season,
    category = ProspectCategory.NORTH_AMERICAN_SKATER,
  }: DraftRankingsParams = {},
): Promise<DraftRankings> {
  if (!inRange(category, 1, 4)) {
    throw new RangeError(
      `Invalid prospect category ${category}. Use 1-4 (see ProspectCategory).`,
    );
  }
  if (season === undefined || season === null) {
    return getWeb(ctx, 'draft/rankings/now');
  }
  return getWeb(ctx, `draft/rankings/${season}/${category}`);
}

/**
 * Gets the live draft tracker: the current draft's broadcast info, state
 * and the picks of the round in progress (or the last round, once the draft
 * is over).
 *
 * @example https://api-web.nhle.com/v1/draft-tracker/picks/now
 */
export async function tracker(ctx: Context): Promise<DraftTracker> {
  return getWeb(ctx, 'draft-tracker/picks/now');
}

/**
 * Gets the picks of a draft. Note the defaults differ: `picks()` hits
 * `draft/picks/now`, which the API redirects to round **1** of the current
 * draft, while `picks({ season })` returns every round.
 *
 * @param params.season Draft year in YYYY format (not YYYYYYYY), e.g. 2023. Defaults to "now".
 * @param params.round Round 1-7 or 'all'. Defaults to 'all' when `season` is given.
 * @throws RangeError If `round` is not 1-7 or 'all'
 * @example https://api-web.nhle.com/v1/draft/picks/2023/all
 */
export async function picks(
  ctx: Context,
  { season, round = 'all' }: DraftPicksParams = {},
): Promise<DraftPicks> {
  if (round !== 'all' && !inRange(round, 1, 7)) {
    throw new RangeError(`Invalid draft round ${round}. Use 1-7 or 'all'.`);
  }
  if (season === undefined || season === null) {
    return getWeb(ctx, 'draft/picks/now');
  }
  return getWeb(ctx, `draft/picks/${season}/${round}`);
}

export const draftApi = {
  rankings,
  tracker,
  picks,
} as const;
