import { draftApi } from '#src/api/draft.mjs';
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

/**
 * Binds `ctx` to every function in an API module. Generic methods lose their
 * type parameters here (they're instantiated with their constraints), so
 * override those with `bindFn`.
 */
function bindModule<
  Module extends Record<string, (ctx: Context, ...args: never[]) => unknown>,
>(ctx: Context, api: Module): Bound<Module> {
  return Object.fromEntries(
    Object.entries(api).map(([key, fn]) => [
      key,
      (...args: never[]) => fn(ctx, ...args),
    ]),
  ) as Bound<Module>;
}

/**
 * Binds `ctx` to a single function. Keeps its generics through higher-order
 * function inference, e.g. so `reportType` / `statsType` still decide the
 * row type.
 */
function bindFn<Args extends unknown[], Result>(
  ctx: Context,
  fn: (ctx: Context, ...args: Args) => Result,
): (...args: Args) => Result {
  return (...args) => fn(ctx, ...args);
}

/**
 * Builds the main client used to access the NHL API.
 *
 * @example
 * const client = createNHLClient();
 * const client = createNHLClient({ debug: true }); // for a little extra logging
 * const teams = await client.teams.teams();
 */
export function createNHLClient(options: ClientOptions = {}) {
  const config = resolveConfig(options);
  const ctx: Context = { get: createGet(config), sleep };

  return {
    config,
    teams: bindModule(ctx, teamsApi),
    standings: bindModule(ctx, standingsApi),
    schedule: bindModule(ctx, scheduleApi),
    gameCenter: bindModule(ctx, gameCenterApi),
    stats: {
      ...bindModule(ctx, statsApi),
      skaterStatsWithQueryContext: bindFn(
        ctx,
        statsApi.skaterStatsWithQueryContext,
      ),
      goalieStatsSummary: bindFn(ctx, statsApi.goalieStatsSummary),
    },
    misc: bindModule(ctx, miscApi),
    helpers: bindModule(ctx, helpersApi),
    players: bindModule(ctx, playersApi),
    edge: bindModule(ctx, edgeApi),
    draft: bindModule(ctx, draftApi),
  } as const;
}

export type NHLClient = ReturnType<typeof createNHLClient>;
