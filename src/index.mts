// Namespace re-exports move each module's interfaces under the namespace, so
// the public param/result types are also exported by name here.
export type {
  EdgePlayerParams,
  EdgeSeasonParams,
  EdgeTeamParams,
} from '#src/api/edge.mjs';
export * as edge from '#src/api/edge.mjs';
export * as gameCenter from '#src/api/game-center.mjs';
export * as helpers from '#src/api/helpers.mjs';
export * as misc from '#src/api/misc.mjs';
export * as players from '#src/api/players.mjs';
export * from '#src/api/query/index.mjs';
export type { DailySchedule } from '#src/api/schedule.mjs';
export * as schedule from '#src/api/schedule.mjs';
export { normalizeDate } from '#src/api/schedule.mjs';
export * as standings from '#src/api/standings.mjs';
export type {
  GoalieStatsSummaryParams,
  SkaterStatsSummaryParams,
  SkaterStatsWithQueryContextParams,
  TeamSummaryParams,
} from '#src/api/stats.mjs';
export * as stats from '#src/api/stats.mjs';
export type { Team } from '#src/api/teams.mjs';
export * as teams from '#src/api/teams.mjs';
export * from '#src/config.mjs';
export type { Context, Get } from '#src/context.mjs';
export * from '#src/errors.mjs';
export {
  buildUrl,
  createGet,
  Endpoint,
  type QueryParams,
  type QueryParamValue,
} from '#src/http-client.mjs';
export { createNHLClient, type NHLClient } from '#src/nhl-client.mjs';
export type * from '#src/types/index.mjs';
export type { Id } from '#src/utils.mjs';
