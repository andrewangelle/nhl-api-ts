import type { EndpointSpec } from '#src/load.mjs';

function cap(text: string) {
  return text[0].toUpperCase() + text.slice(1);
}

/** Per-endpoint unwrap/grouping rules; anything not listed returns its body as-is. */
export const SPECS: Record<string, EndpointSpec> = {
  'teams.franchises': { unwrap: 'data', name: 'Franchise' },
  'teams.teamRoster': { name: 'Roster' },
  'teams.rosterSeasons': { name: 'SeasonId' },
  'teams.teamScoreboard': { name: 'TeamScoreboard' },
  'teams.statsTeams': { unwrap: 'data', name: 'StatsTeam' },
  'teams.teamById': { unwrap: 'data', name: 'StatsTeam' },
  'players.playersByTeam': { name: 'Roster' },
  'players.playerSpotlight': { name: 'PlayerSpotlight' },
  'players.prospectsByTeam': { name: 'Prospects' },
  'players.playerSearch': { unwrap: 'data', name: 'StatsPlayer' },
  'standings.leagueStandings': { name: 'LeagueStandings' },
  'standings.seasonStandingManifest': {
    unwrap: 'seasons',
    name: 'StandingsSeason',
  },
  'misc.glossary': { unwrap: 'data', name: 'GlossaryEntry' },
  'misc.config': {
    name: 'StatsConfig',
    emit: {
      mapPaths: ['.playerReportData', '.goalieReportData', '.teamReportData'],
    },
  },
  'misc.countries': { unwrap: 'data', name: 'Country' },
  'misc.seasonSpecificRulesAndInfo': { unwrap: 'data', name: 'SeasonRules' },
  'misc.draftYearAndRounds': { unwrap: 'data', name: 'DraftYear' },
  'misc.componentSeasons': { unwrap: 'data', name: 'ComponentSeason' },
  'misc.games': { unwrap: 'data', name: 'StatsGame' },
  'misc.seasonIds': { name: 'SeasonId' },
  'misc.location': { name: 'GeoLocation' },
  'misc.postalLookup': { name: 'PostalLookupTeam' },
  'draft.rankings': { name: 'DraftRankings' },
  'draft.tracker': { name: 'DraftTracker' },
  'draft.picks': { name: 'DraftPicks' },
  'schedule.weeklySchedule': { name: 'WeeklySchedule' },
  'schedule.teamMonthlySchedule': { unwrap: 'games', name: 'ClubScheduleGame' },
  'schedule.teamWeeklySchedule': { unwrap: 'games', name: 'ClubScheduleGame' },
  'schedule.teamSeasonSchedule': { name: 'TeamSeasonSchedule' },
  'schedule.calendarSchedule': { name: 'CalendarSchedule' },
  'schedule.playoffCarousel': { name: 'PlayoffCarousel' },
  'schedule.playoffSeriesSchedule': { name: 'PlayoffSeriesSchedule' },
  'schedule.playoffBracket': { name: 'PlayoffBracket' },
  'gameCenter.boxscore': { name: 'Boxscore' },
  'gameCenter.playByPlay': { name: 'PlayByPlay' },
  'gameCenter.matchUp': { name: 'GameLanding' },
  'gameCenter.dailyScores': { name: 'DailyScores' },
  'gameCenter.shiftChartData': { name: 'ShiftChart' },
  'gameCenter.seasonSeriesMatchup': { name: 'RightRail' },
  'gameCenter.gameStory': { name: 'GameStory' },
  'gameCenter.wscPlayByPlay': { name: 'WscPlay' },
  'edge.skaterDistanceTop10': { name: 'SkaterDistanceTop10Row' },
  'edge.skaterSpeedTop10': { name: 'SkaterSpeedTop10Row' },
  'edge.skaterZoneTimeTop10': { name: 'SkaterZoneTimeTop10Row' },
  'edge.skaterShotSpeedTop10': { name: 'SkaterShotSpeedTop10Row' },
  'edge.skaterShotLocationTop10': { name: 'SkaterShotLocationTop10Row' },
  'edge.goalie5v5Top10': { name: 'Goalie5v5Top10Row' },
  'edge.goalieShotLocationTop10': { name: 'GoalieShotLocationTop10Row' },
  'edge.goalieSavePercentageTop10': { name: 'GoalieSavePercentageTop10Row' },
  'edge.teamSkatingDistanceTop10': { name: 'TeamSkatingDistanceTop10Row' },
  'edge.teamSkatingSpeedTop10': { name: 'TeamSkatingSpeedTop10Row' },
  'edge.teamZoneTimeTop10': { name: 'TeamZoneTimeTop10Row' },
  'edge.teamShotSpeedTop10': { name: 'TeamShotSpeedTop10Row' },
  'edge.teamShotLocationTop10': { name: 'TeamShotLocationTop10Row' },
  'stats.gametypesPerSeasonDirectoryByTeam': { name: 'ClubStatsSeason' },
  'stats.playerCareerStats': { name: 'PlayerLanding' },
  'stats.playerGameLog': { unwrap: 'gameLog', name: 'GameLogEntry' },
  'stats.skaterStatsLeaders': { name: 'SkaterStatsLeaders' },
  'stats.goalieStatsLeaders': { name: 'GoalieStatsLeaders' },
  'stats.clubStats': { name: 'ClubStats' },
  'stats.skaterLeaders': {
    unwrap: 'data',
    groupBy: 'attribute',
    name: 'SkaterLeaderRow',
  },
  'stats.goalieLeaders': {
    unwrap: 'data',
    groupBy: 'attribute',
    name: 'GoalieLeaderRow',
  },
  'stats.skaterMilestones': { unwrap: 'data', name: 'SkaterMilestone' },
  'stats.goalieMilestones': { unwrap: 'data', name: 'GoalieMilestone' },
  'stats.teamSummary': { unwrap: 'data', name: 'TeamSummaryRow' },
  'stats.skaterStatsSummary': { unwrap: 'data', name: 'SkaterSummaryRow' },
  'stats.skaterStatsWithQueryContext': {
    unwrap: 'data',
    groupBy: 'reportType',
    name: 'SkaterRow',
  },
  'stats.goalieStatsSummary': {
    unwrap: 'data',
    groupBy: 'statsType',
    name: 'GoalieRow',
  },
};

/**
 * Endpoints that hit the same URL and return the same payload as another one,
 * so their samples feed that endpoint's type instead of a duplicate.
 */
export const ALIASES: Record<string, { endpoint: string; group?: string }> = {
  'schedule.dailySchedule': { endpoint: 'schedule.weeklySchedule' },
  'schedule.teamWeeklySchedule': { endpoint: 'schedule.teamMonthlySchedule' },
  'stats.skaterStatsSummary': {
    endpoint: 'stats.skaterStatsWithQueryContext',
    group: 'summary',
  },
};

export function specFor(endpoint: string): EndpointSpec {
  const known = SPECS[endpoint];
  if (known) {
    return known;
  }
  const method = endpoint.split('.')[1] ?? endpoint;
  return { name: cap(method) };
}

/** Registries that key a grouped endpoint's row types by its `groupBy` value. */
export const GROUP_REGISTRIES: Record<string, string> = {
  'stats.skaterStatsWithQueryContext': 'SkaterReportRows',
  'stats.goalieStatsSummary': 'GoalieReportRows',
  'stats.skaterLeaders': 'SkaterLeaderRows',
  'stats.goalieLeaders': 'GoalieLeaderRows',
};

/**
 * A sample group's endpoint and, for a grouped endpoint, its `groupBy` value:
 * `stats.goalieLeaders.gaa` is `stats.goalieLeaders` and `gaa`.
 */
export function splitGroup(group: string): {
  endpoint: string;
  groupName?: string;
} {
  const endpoint = group.split('.').slice(0, 2).join('.');
  return group === endpoint
    ? { endpoint }
    : { endpoint, groupName: group.slice(endpoint.length + 1) };
}

/**
 * The SDK type a sample group's payload (or each item, for array payloads)
 * is declared as: the spec name, or the registry entry for a grouped
 * endpoint (`SkaterReportRows['summary']`).
 */
export function declaredTypeFor(group: string): string {
  const { endpoint, groupName } = splitGroup(group);
  const registry = GROUP_REGISTRIES[endpoint];
  if (registry && groupName) {
    return `${registry}['${groupName}']`;
  }
  return specFor(endpoint).name;
}
