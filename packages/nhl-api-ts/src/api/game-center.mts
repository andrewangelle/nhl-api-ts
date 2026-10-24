import type { Context } from '#src/context.mjs';
import { Endpoint } from '#src/http-client.mjs';
import type {
  Boxscore,
  DailyScores,
  GameLanding,
  GameMeta,
  GameStory,
  PlayByPlay,
  PlayReplay,
  RightRail,
  Scoreboard,
  ShiftChart,
  WscPlay,
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
export async function boxscore(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<Boxscore> {
  return getWeb(ctx, `gamecenter/${gameId}/boxscore`);
}

/**
 * Get the full play-by-play feed for a specific NHL game, containing every
 * recorded event (shots, hits, faceoffs, goals, penalties...).
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/play-by-play
 */
export async function playByPlay(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<PlayByPlay> {
  return getWeb(ctx, `gamecenter/${gameId}/play-by-play`);
}

/**
 * Get the landing-page summary for a specific NHL game, including scoring by
 * period, three stars and penalties.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/landing
 */
export async function matchUp(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<GameLanding> {
  return getWeb(ctx, `gamecenter/${gameId}/landing`);
}

/**
 * Get scores and game states for all NHL games on a given date. Returns the
 * current day's scores when no date is supplied.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/score/2023-10-15
 */
export async function dailyScores(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<DailyScores> {
  return getWeb(ctx, `score/${date ? date : 'now'}`);
}

/**
 * Get individual player shift data for a specific game, including start/end
 * times and durations.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @param params.excludes Fields to exclude from the response. Defaults to ["eventDetails"].
 * @example https://api.nhle.com/stats/rest/en/shiftcharts?cayenneExp=gameId=2023020280 and ...
 */
export async function shiftChartData(
  ctx: Context,
  { gameId, excludes = ['eventDetails'] }: { gameId: Id; excludes?: string[] },
): Promise<ShiftChart> {
  const excludeP = excludes.join(',');
  const exprP = `gameId=${gameId} and ((duration != '00:00' and typeCode = 517) or typeCode != 517 )`;
  return (
    await ctx.get(
      Endpoint.API_STATS,
      `en/shiftcharts?cayenneExp=${exprP}&exclude=${excludeP}`,
    )
  ).json();
}

/**
 * Get the season-series record and contextual stats for a specific game,
 * including team season stats and last games.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/gamecenter/2023020280/right-rail
 */
export async function seasonSeriesMatchup(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<RightRail> {
  return getWeb(ctx, `gamecenter/${gameId}/right-rail`);
}

/**
 * Get the narrative game story for a specific game, including scoring
 * summaries, three stars and team game stats.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/wsc/game-story/2023020280
 */
export async function gameStory(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<GameStory> {
  return getWeb(ctx, `wsc/game-story/${gameId}`);
}

/**
 * Get the league scoreboard: every game in the week around a date, grouped by
 * date. Returns the week around today when no date is supplied.
 *
 * @param params.date Date in YYYY-MM-DD format. Defaults to "now".
 * @example https://api-web.nhle.com/v1/scoreboard/2023-10-15
 */
export async function scoreboard(
  ctx: Context,
  { date }: { date?: string } = {},
): Promise<Scoreboard> {
  return getWeb(ctx, `scoreboard/${date ?? 'now'}`);
}

/**
 * Get the play-by-play feed nhl.com's game story widget uses. A bare array of
 * plays, with a different play shape from `playByPlay`.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/wsc/play-by-play/2023020280
 */
export async function wscPlayByPlay(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<WscPlay[]> {
  return getWeb(ctx, `wsc/play-by-play/${gameId}`);
}

/**
 * Get the replay card for one play-by-play event: the game header, plus a
 * `goal` object (scorer, assists, highlight clip and the `pptReplayUrl`
 * puck-and-player-tracking link) when the event is a goal. Any event id works.
 *
 * @experimental Feeds an nhl.com widget; the shape may change without notice.
 * @param params.gameId Game id, e.g. 2023020280
 * @param params.eventNumber The play's `eventId` from `playByPlay`, e.g. 193
 * @example https://api-web.nhle.com/v1/ppt-replay/2023020280/193
 */
export async function playReplay(
  ctx: Context,
  { gameId, eventNumber }: { gameId: Id; eventNumber: Id },
): Promise<PlayReplay> {
  return getWeb(ctx, `ppt-replay/${gameId}/${eventNumber}`);
}

/**
 * Get the metadata nhl.com uses to render a game page: the two teams, the
 * season state and the game state.
 *
 * @param params.gameId Game id, e.g. 2023020280
 * @example https://api-web.nhle.com/v1/meta/game/2023020280
 */
export async function gameMeta(
  ctx: Context,
  { gameId }: { gameId: Id },
): Promise<GameMeta> {
  return getWeb(ctx, `meta/game/${gameId}`);
}

export const gameCenterApi = {
  boxscore,
  playByPlay,
  matchUp,
  dailyScores,
  shiftChartData,
  seasonSeriesMatchup,
  gameStory,
  scoreboard,
  wscPlayByPlay,
  playReplay,
  gameMeta,
} as const;
