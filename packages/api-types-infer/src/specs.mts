import type { EndpointSpec } from '#src/load.mjs';

function cap(text: string) {
  return text[0].toUpperCase() + text.slice(1);
}

/** Per-endpoint unwrap/grouping rules; anything not listed returns its body as-is. */
export const SPECS: Record<string, EndpointSpec> = {
  'teams.franchises': { unwrap: 'data', name: 'Franchise' },
  'teams.teamRoster': { name: 'Roster' },
  'players.playersByTeam': { name: 'Roster' },
  'players.prospectsByTeam': { name: 'Prospects' },
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
  'stats.gametypesPerSeasonDirectoryByTeam': { name: 'ClubStatsSeason' },
  'stats.playerCareerStats': { name: 'PlayerLanding' },
  'stats.playerGameLog': { unwrap: 'gameLog', name: 'GameLogEntry' },
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
