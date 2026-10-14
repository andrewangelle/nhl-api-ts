import { QueryBuilder } from '#src/api/query/builder.mjs';
import { FranchiseQuery } from '#src/api/query/filters/franchise.mjs';
import { SeasonQuery } from '#src/api/query/filters/season.mjs';
import { Schedule } from '#src/api/schedule.mjs';
import { Stats } from '#src/api/stats.mjs';
import { Teams } from '#src/api/teams.mjs';
import type { HttpClient } from '#src/http-client.mjs';
import { type Id, type JsonObject, sleep } from '#src/utils.mjs';

/**
 * Convenience methods that combine several endpoints. These make many
 * requests (one or more per team), pausing `apiSleepRate` seconds between
 * teams to avoid rate limiting.
 */
export class Helpers {
  readonly client: HttpClient;

  constructor(httpClient: HttpClient) {
    this.client = httpClient;
  }

  /** @internal Overridable for tests. */
  sleep(seconds: number): Promise<void> {
    return sleep(seconds);
  }

  /**
   * Gets all game IDs for a specified season by querying every team's
   * schedule. Games appear once per participating team, so ids may repeat.
   *
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @param params.gameTypes Only include these game types (1=Preseason, 2=Regular, 3=Playoffs). Defaults to all.
   * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 1.
   * @example await client.helpers.gameIdsBySeason({ season: '20232024', gameTypes: [2] })
   */
  async gameIdsBySeason({
    season,
    gameTypes,
    apiSleepRate = 1,
  }: {
    season: Id;
    gameTypes?: number[];
    apiSleepRate?: number;
  }): Promise<number[]> {
    const teams = await new Teams(this.client).teams();
    const gameIds: number[] = [];
    const scheduleApi = new Schedule(this.client);

    for (const team of teams) {
      const teamAbbr = team.abbr ?? '';
      if (!teamAbbr) {
        continue;
      }

      await this.sleep(apiSleepRate);
      const schedule = await scheduleApi.teamSeasonSchedule({
        teamAbbr,
        season,
      });
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
  }

  /**
   * Gets every rostered player across all NHL teams for a given season. Each
   * player gets a `team` abbreviation and flattened `firstName` / `lastName`.
   *
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 0.5.
   * @example await client.helpers.allPlayers({ season: '20232024' })
   */
  async allPlayers({
    season,
    apiSleepRate = 0.5,
  }: {
    season: Id;
    apiSleepRate?: number;
  }): Promise<JsonObject[]> {
    const teamsClient = new Teams(this.client);
    const teams = await teamsClient.teams();
    console.error('Fetching all player base stats. This may take a while...');

    const outData: JsonObject[] = [];
    for (const team of teams) {
      await this.sleep(apiSleepRate);
      const players = await teamsClient.teamRoster({
        teamAbbr: team.abbr,
        season,
      });
      for (const p of [
        ...players.forwards,
        ...players.defensemen,
        ...players.goalies,
      ]) {
        p.team = team.abbr;
        p.firstName = p.firstName.default;
        p.lastName = p.lastName.default;
        outData.push(p);
      }
    }
    return outData;
  }

  /**
   * Gets summary statistics for every skater in a given season, merged with
   * the roster info from `allPlayers` (stat fields win on key collisions).
   * Stat entries without a matching rostered player are included as-is.
   *
   * @param params.season Season in YYYYYYYY format, e.g. 20232024
   * @param params.apiSleepRate Seconds to sleep between team requests. Defaults to 1.
   * @example await client.helpers.allPlayersSummaryStatistics({ season: '20232024' })
   */
  async allPlayersSummaryStatistics({
    season,
    apiSleepRate = 1,
  }: {
    season: Id;
    apiSleepRate?: number;
  }): Promise<JsonObject[]> {
    console.error(
      'WARNING: This method will take a while to run.  In the event of rate limiting, you may need to increase the api_sleep_rate.',
    );
    const players = await this.allPlayers({ season, apiSleepRate });
    const teams = await new Teams(this.client).teams();
    const statsClient = new Stats(this.client);

    const seasonQuery = new SeasonQuery(season, season);
    const queryBuilder = new QueryBuilder();
    const outData: JsonObject[] = [];

    for (const team of teams) {
      await this.sleep(apiSleepRate);
      const franQuery = new FranchiseQuery(team.franchise_id as number);
      const context = queryBuilder.build([franQuery, seasonQuery]);
      const data = await statsClient.skaterStatsWithQueryContext({
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
  }
}
