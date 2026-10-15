import { edgeApi } from '#src/api/edge.mjs';
import { gameCenterApi } from '#src/api/game-center.mjs';
import { helpersApi } from '#src/api/helpers.mjs';
import { miscApi } from '#src/api/misc.mjs';
import { playersApi } from '#src/api/players.mjs';
import { scheduleApi } from '#src/api/schedule.mjs';
import { standingsApi } from '#src/api/standings.mjs';
import { statsApi } from '#src/api/stats.mjs';
import { teamsApi } from '#src/api/teams.mjs';
import { type ClientOptions, resolveConfig } from '#src/config.mjs';
import type { Context } from '#src/context.mjs';
import { createGet } from '#src/http-client.mjs';
import { sleep } from '#src/utils.mjs';

type Bound<Module> = {
  [Method in keyof Module]: Module[Method] extends (
    ctx: Context,
    ...args: infer Args
  ) => infer MethodResponse
    ? (...args: Args) => MethodResponse
    : never;
};

const bind = <
  Module extends Record<string, (ctx: Context, ...args: never[]) => unknown>,
>(
  ctx: Context,
  api: Module,
): Bound<Module> =>
  Object.fromEntries(
    Object.entries(api).map(([key, fn]) => [
      key,
      (...args: never[]) => fn(ctx, ...args),
    ]),
  ) as Bound<Module>;

/**
 * Builds the main client used to access the NHL API.
 *
 * @example
 * const client = createNHLClient();
 * const client = createNHLClient({ debug: true }); // for a lil extra logging
 * const teams = await client.teams.teams();
 */
export const createNHLClient = (options: ClientOptions = {}) => {
  const config = resolveConfig(options);
  const ctx: Context = { get: createGet(config), sleep };

  return {
    config,
    teams: bind(ctx, teamsApi),
    standings: bind(ctx, standingsApi),
    schedule: bind(ctx, scheduleApi),
    gameCenter: bind(ctx, gameCenterApi),
    stats: bind(ctx, statsApi),
    misc: bind(ctx, miscApi),
    helpers: bind(ctx, helpersApi),
    players: bind(ctx, playersApi),
    edge: bind(ctx, edgeApi),
  } as const;
};

export type NHLClient = ReturnType<typeof createNHLClient>;
