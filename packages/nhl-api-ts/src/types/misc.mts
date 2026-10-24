// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameType,
  LocalizedString,
  OddsPartner,
  OpenUnion,
} from '#src/types/common.mjs';
import type { MetaTeam } from '#src/types/game-center.mjs';

export interface ComponentSeason {
  id: string;
  component: string;
  gameTypeId: GameType;
  seasonId: number;
}

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

export interface GeoLocation {
  country: string;
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

export interface Meta {
  players: MetaPlayer[];
  teams: MetaTeam[];
  /** Empty in every observed response */
  seasonStates: unknown[];
}

export interface MetaPlayer {
  playerId: number;
  playerSlug: string;
  actionShot: string;
  name: LocalizedString;
  currentTeams: MetaPlayerTeam[];
  isGoalie: boolean;
}

export interface MetaPlayerTeam {
  teamId: number;
  abbrev: string;
  force: boolean;
}

export interface PartnerGameOdd {
  description: OpenUnion<
    'MONEY_LINE_2_WAY' | 'MONEY_LINE_3_WAY' | 'OVER_UNDER' | 'PUCK_LINE'
  >;
  value: number;
  /** The line, e.g. "-1.5" or "O5.5"; "Draw" for the 3-way draw price; "" otherwise */
  qualifier: string;
}

export interface PartnerGameOdds {
  currentOddsDate: string;
  lastUpdatedUTC: string;
  bettingPartner: OddsPartner;
  games: PartnerGameOddsGame[];
}

export interface PartnerGameOddsGame {
  gameId: number;
  gameType: GameType;
  startTimeUTC: string;
  homeTeam: PartnerGameOddsTeam;
  awayTeam: PartnerGameOddsTeam;
}

export interface PartnerGameOddsTeam {
  id: number;
  name: LocalizedString;
  abbrev: string;
  logo: string;
  odds: PartnerGameOdd[];
}

export interface PostalLookupTeam {
  stateProvince: string;
  teamName: LocalizedString;
  postalCode: string;
  country: string;
  city: string;
  /** Absent for Canadian postal codes */
  networkType?: string;
  /** Absent for Canadian postal codes */
  county?: string;
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

/** One game of the stats API (`en/game`). */
export interface StatsGame {
  id: number;
  easternStartTime: string;
  gameDate: string;
  gameNumber: number;
  gameScheduleStateId: number;
  gameStateId: number;
  gameType: GameType;
  homeScore: number;
  homeTeamId: number;
  period: number;
  season: number;
  visitingScore: number;
  visitingTeamId: number;
}

export interface TvSchedule {
  date: string;
  startDate: string;
  endDate: string;
  broadcasts: TvScheduleBroadcast[];
}

export interface TvScheduleBroadcast {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  title: string;
  description: string;
  houseNumber: string;
  broadcastType: OpenUnion<'HD'>;
  /** "LIVE" for live games, "" otherwise */
  broadcastStatus: OpenUnion<'LIVE' | ''>;
  broadcastImageUrl: string;
}
