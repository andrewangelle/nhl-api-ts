import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  Boxscore,
  DailyScores,
  GameLanding,
  GameStory,
  PlayByPlay,
  RightRail,
  ShiftChart,
} from '#src/types/index.mjs';
import type { Id } from '#src/utils.mjs';

async function getWeb<Body>(ctx: Context, resource: string): Promise<Body> {
  return (await ctx.get(Endpoint.API_WEB_V1, resource)).json();
}

/**
 * Get the full boxscore for a specific NHL game, including team scores,
 * shots on goal, and per-player stats.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/boxscore
 */
export const boxscore = async (
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<Boxscore> => getWeb(ctx, `gamecenter/${gameId}/boxscore`);

/**
 * Get the full play-by-play feed for a specific NHL game, containing every
 * recorded event (shots, hits, faceoffs, goals, penalties...).
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/play-by-play
 */
export const playByPlay = async (
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<PlayByPlay> => getWeb(ctx, `gamecenter/${gameId}/play-by-play`);

/**
 * Get the landing-page summary for a specific NHL game, including scoring by
 * period, three stars and penalties.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/landing
 */
export const matchUp = async (
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<GameLanding> => getWeb(ctx, `gamecenter/${gameId}/landing`);

/**
 * Get scores and game states for all NHL games on a given date. Returns the
 * current day's scores when no date is supplied.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/score/2023-10-15
 */
export const dailyScores = async (
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<DailyScores> => getWeb(ctx, `score/${date ? date : 'now'}`);

/**
 * Get individual player shift data for a specific game, including start/end
 * times and durations.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @param params.excludes Fields to exclude from the response. Defaults to ["eventDetails"].
 * @example https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId=2023020280 and ...
 */
export const shiftChartData = async (
  ctx: Context,
  { gameId, excludes = ['eventDetails'] }: { gameId: Id; excludes?: string[] },
): Promise<ShiftChart> => {
  const excludeP = excludes.join(',');
  const exprP = `gameId=${gameId} and ((duration != '00:00' and typeCode = 517) or typeCode != 517 )`;
  return (
    await ctx.get(
      Endpoint.API_STATS,
      `en/shiftcharts?cayenneExp=${exprP}&exclude=${excludeP}`,
    )
  ).json();
};

/**
 * Get the season-series record and contextual stats for a specific game,
 * including team season stats and last games.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/right-rail
 */
export const seasonSeriesMatchup = async (
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<RightRail> => getWeb(ctx, `gamecenter/${gameId}/right-rail`);

/**
 * Get the narrative game story for a specific game, including scoring
 * summaries, three stars and team game stats.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/wsc/game-story/2023020280
 */
export const gameStory = async (
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<GameStory> => getWeb(ctx, `wsc/game-story/${gameId}`);

export const gameCenterApi = {
  boxscore,
  playByPlay,
  matchUp,
  dailyScores,
  shiftChartData,
  seasonSeriesMatchup,
  gameStory,
} as const;
