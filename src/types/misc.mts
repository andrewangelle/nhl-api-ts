// Response types derived from live NHL API probing. See CONTRIBUTING.md.

export interface Country {
  id: string;
  country3Code: string;
  countryCode: string;
  countryName: string;
  hasPlayerStats: number;
  imageUrl: string | null;
  iocCode: string;
  isActive: number;
  nationalityName: string;
  olympicUrl: string | null;
  thumbnailUrl: string | null;
}

export interface DraftYear {
  id: number;
  draftYear: number;
  rounds: number;
}

export interface GlossaryEntry {
  id: number;
  abbreviation: string;
  definition: string;
  firstSeasonForStat: number | null;
  fullName: string;
  languageCode: string;
  lastUpdated: string;
}

export interface ReportColumns {
  displayItems: string[];
  resultFilters: string[];
  sortKeys: string[];
}

export interface ReportConfig {
  game: ReportColumns;
  season: ReportColumns;
}

export interface SeasonRules {
  id: number;
  allStarGameInUse: number;
  conferencesInUse: number;
  divisionsInUse: number;
  endDate: string;
  entryDraftInUse: number;
  formattedSeasonId: string;
  minimumPlayoffMinutesForGoalieStatsLeaders: number;
  minimumRegularGamesForGoalieStatsLeaders: number;
  nhlStanleyCupOwner: number;
  numberOfGames: number;
  olympicsParticipation: number;
  pointForOTLossInUse: number;
  preseasonStartdate: string | null;
  regularSeasonEndDate: string;
  rowInUse: number;
  seasonOrdinal: number;
  startDate: string;
  supplementalDraftInUse: number;
  tiesInUse: number;
  totalPlayoffGames: number;
  totalRegularSeasonGames: number;
  wildcardInUse: number;
}

export interface StatsConfig {
  playerReportData: Record<string, ReportConfig>;
  goalieReportData: Record<string, ReportConfig>;
  teamReportData: Record<string, ReportConfig>;
  aggregatedColumns: string[];
  individualColumns: string[];
}
