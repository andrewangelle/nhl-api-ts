import { buildQuery } from '#src/api/query/builder.mjs';
import { filter } from '#src/api/query/filters.mjs';
import { teamSeasonSchedule } from '#src/api/schedule.mjs';
import { skaterStatsWithQueryContext } from '#src/api/stats.mjs';
import { teams as fetchTeams, teamRoster } from '#src/api/teams.mjs';
import type { Context } from '#src/context.mjs';
import type { Id, JsonObject } from '#src/utils.mjs';

/**
 * Gets all game IDs for a specified season by querying every team's
 * schedule. Games appear once per participating team, so ids may repeat.
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @param params.gameTypes Only include these game types (1=Preseason, 2=Regular, 3=Playoffs). Defaults to all.
 * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 1.
 * @example await client.helpers.gameIdsBySeason({ season: '20232024', gameTypes: [2] })
 */
export const gameIdsBySeason = async (
  ctx: Context,
  {
    season,
    gameTypes,
    apiSleepRate = 1,
  }: { season: Id; gameTypes?: number[]; apiSleepRate?: number },
): Promise<number[]> => {
  const teams = await fetchTeams(ctx);
  const gameIds: number[] = [];

  for (const team of teams) {
    const teamAbbr = team.abbr ?? '';
    if (!teamAbbr) {
      continue;
    }

    await ctx.sleep(apiSleepRate);
    const schedule = await teamSeasonSchedule(ctx, { teamAbbr, season });
    const games: JsonObject[] = schedule.games ?? [];
    for (const game of games) {
      const gameType = game.gameType;
      const gameId = game.id;
      if (
        gameId &&
        (!gameTypes || gameTypes.length === 0 || gameTypes.includes(gameType))
      ) {
        gameIds.push(gameId);
      }
    }
  }
  return gameIds;
};

/**
 * Gets every rostered player across all NHL teams for a given season. Each
 * player gets a `team` abbreviation and flattened `firstName` / `lastName`.
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 0.5.
 * @example await client.helpers.allPlayers({ season: '20232024' })
 */
export const allPlayers = async (
  ctx: Context,
  { season, apiSleepRate = 0.5 }: { season: Id; apiSleepRate?: number },
): Promise<JsonObject[]> => {
  const teams = await fetchTeams(ctx);
  console.error('Fetching all player base stats. This may take a while...');

  const outData: JsonObject[] = [];
  for (const team of teams) {
    await ctx.sleep(apiSleepRate);
    const players = await teamRoster(ctx, { teamAbbr: team.abbr, season });
    for (const player of [
      ...players.forwards,
      ...players.defensemen,
      ...players.goalies,
    ]) {
      outData.push({
        ...player,
        team: team.abbr,
        firstName: player.firstName.default,
        lastName: player.lastName.default,
      });
    }
  }
  return outData;
};

/**
 * Gets summary statistics for every skater in a given season, merged with
 * the roster info from `allPlayers` (stat fields win on key collisions).
 * Stat entries without a matching rostered player are included as-is.
 *
 * @param params.season Season in YYYYYYYY format, e.g. 20232024
 * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 1.
 * @example await client.helpers.allPlayersSummaryStatistics({ season: '20232024' })
 */
export const allPlayersSummaryStatistics = async (
  ctx: Context,
  { season, apiSleepRate = 1 }: { season: Id; apiSleepRate?: number },
): Promise<JsonObject[]> => {
  console.error(
    'WARNING: This method will take a while to run.  In the event of rate limiting, you may need to increase the api_sleep_rate.',
  );
  const players = await allPlayers(ctx, { season, apiSleepRate });
  const teams = await fetchTeams(ctx);

  const outData: JsonObject[] = [];

  for (const team of teams) {
    await ctx.sleep(apiSleepRate);
    const context = buildQuery([
      filter.franchise(team.franchise_id as number),
      filter.season(season, season),
    ]);
    const data = await skaterStatsWithQueryContext(ctx, {
      reportType: 'summary',
      queryContext: context,
      aggregate: true,
    });
    outData.push(...(data.data ?? []));
  }

  const playerById = new Map<unknown, JsonObject>(
    players.map((player) => [player.id, player]),
  );
  return outData.map((statEntry) => {
    const player = statEntry.playerId
      ? playerById.get(statEntry.playerId)
      : undefined;
    return player ? { ...player, ...statEntry } : statEntry;
  });
};

export const helpersApi = {
  gameIdsBySeason,
  allPlayers,
  allPlayersSummaryStatistics,
} as const;
