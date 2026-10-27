// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameOutcome,
  GameScheduleState,
  GameState,
  GameType,
  LocalizedString,
  OddsPartner,
  PeriodDescriptor,
  PeriodType,
  SeriesStatus,
  TeamLogo,
  TeamOdd,
  TvBroadcast,
} from '#src/types/common.mjs';

export interface CalendarSchedule {
  endDate: string;
  nextStartDate: string;
  previousStartDate: string;
  startDate: string;
  teams: CalendarScheduleTeam[];
}

export interface CalendarScheduleTeam {
  id: number;
  seasonId: number;
  commonName: LocalizedString;
  abbrev: string;
  name: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  placeName: LocalizedString;
  logo: string;
  darkLogo: string;
  french: boolean;
}

export interface ClubScheduleGame {
  id: number;
  season: number;
  gameType: GameType;
  gameDate: string;
  venue: LocalizedString;
  neutralSite: boolean;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  tvBroadcasts: TvBroadcast[];
  awayTeam: ClubScheduleGameAwayTeam;
  homeTeam: ScheduleHomeTeam;
  periodDescriptor: PeriodDescriptor;
  /** Absent before the game is played */
  gameOutcome?: GameOutcome;
  /** Absent before the game is played */
  winningGoalie?: WinningGoalie;
  /** Absent before the game is played */
  winningGoalScorer?: WinningGoalie;
  /** Absent before the game is played */
  threeMinRecap?: string;
  /** Absent before the game is played */
  condensedGame?: string;
  gameCenterLink: string;
  /** Absent before the game is played */
  threeMinRecapFr?: string;
  /** Absent before the game is played */
  condensedGameFr?: string;
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
}

export interface ClubScheduleGameAwayTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  awaySplitSquad: boolean;
  /** Absent before the game is played */
  score?: number;
  airlineLink?: string;
  airlineDesc?: string;
  hotelLink?: string;
  hotelDesc?: string;
  radioLink?: string;
  promoLink?: string;
  promoDesc?: string;
}

export interface ScheduleHomeTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  homeSplitSquad: boolean;
  /** Absent before the game is played */
  score?: number;
  hotelLink?: string;
  hotelDesc?: string;
  airlineLink?: string;
  airlineDesc?: string;
  radioLink?: string;
  promoLink?: string;
  promoDesc?: string;
}

export interface SpecialEvent {
  parentId: number;
  name: LocalizedString;
  lightLogoUrl?: LocalizedString;
}

export interface GameWeekDay {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
  datePromo: unknown[];
  games: ScheduleGame[];
}

export interface PlayoffBracket {
  bracketLogo: string;
  bracketLogoFr: string;
  series: PlayoffBracketSeries[];
}

export interface PlayoffBracketSeries {
  seriesUrl: string;
  seriesTitle: string;
  seriesAbbrev: string;
  seriesLetter: string;
  playoffRound: number;
  topSeedRank: number;
  topSeedRankAbbrev: string;
  topSeedWins: number;
  bottomSeedRank: number;
  bottomSeedRankAbbrev: string;
  bottomSeedWins: number;
  winningTeamId: number;
  losingTeamId: number;
  topSeedTeam: PlayoffBracketTeam;
  bottomSeedTeam: PlayoffBracketTeam;
  conferenceAbbrev?: string;
  conferenceName?: string;
  seriesLogo?: string;
  seriesLogoFr?: string;
}

export interface PlayoffBracketTeam {
  id: number;
  abbrev: string;
  name: LocalizedString;
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  logo: string;
  darkLogo: string;
}

export interface PlayoffCarousel {
  seasonId: number;
  currentRound: number;
  rounds: PlayoffCarouselRound[];
}

export interface PlayoffCarouselRound {
  roundNumber: number;
  roundLabel: string;
  roundAbbrev: string;
  series: PlayoffCarouselSeries[];
}

export interface PlayoffCarouselSeed {
  id: number;
  abbrev: string;
  wins: number;
  logo: string;
  darkLogo: string;
}

export interface PlayoffCarouselSeries {
  seriesLetter: string;
  roundNumber: number;
  seriesLabel: string;
  seriesLink: string;
  bottomSeed: PlayoffCarouselSeed;
  topSeed: PlayoffCarouselSeed;
  neededToWin: number;
  winningTeamId: number;
  losingTeamId: number;
}

export interface PlayoffSeriesSchedule {
  round: number;
  roundAbbrev: string;
  roundLabel: string;
  seriesLetter: string;
  seriesLogo: string;
  seriesLogoFr: string;
  neededToWin: number;
  length: number;
  bottomSeedTeam: PlayoffSeriesTeam;
  topSeedTeam: PlayoffSeriesTeam;
  games: PlayoffSeriesScheduleGame[];
  fullCoverageUrl: PlayoffFullCoverageUrls;
  conferenceAbbrev?: string;
  conferenceName?: string;
}

export interface PlayoffFullCoverageUrls {
  cs: string;
  de: string;
  sv: string;
  fi: string;
  sk: string;
  en: string;
  fr: string;
  es: string;
}

export interface PlayoffSeriesScheduleGame {
  id: number;
  season: number;
  gameType: GameType;
  gameNumber: number;
  ifNecessary: boolean;
  venue: LocalizedString;
  neutralSite: boolean;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  tvBroadcasts: PlayoffTvBroadcast[];
  awayTeam: PlayoffSeriesGameTeam;
  homeTeam: PlayoffSeriesGameTeam;
  gameCenterLink: string;
  periodDescriptor: PeriodDescriptor;
  seriesStatus: PlayoffSeriesStatus;
  gameOutcome: GameOutcome;
}

export interface PlayoffSeriesGameTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  score: number;
}

export interface PlayoffSeriesMeta {
  seriesTitle: string;
  teams: PlayoffSeriesMetaTeams;
}

export interface PlayoffSeriesMetaTeam {
  name: LocalizedString;
  commonName: LocalizedString;
  tricode: string;
  teamSlug: string;
}

export interface PlayoffSeriesMetaTeams {
  topSeed: PlayoffSeriesMetaTeam;
  bottomSeed: PlayoffSeriesMetaTeam;
}

export interface PlayoffSeriesStatus {
  topSeedWins: number;
  bottomSeedWins: number;
}

export interface PlayoffTvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
  languageCode: string;
  logoUrls?: TeamLogo;
}

export interface PlayoffSeriesTeam {
  id: number;
  name: LocalizedString;
  abbrev: string;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  conference: PlayoffTeamConference;
  record: string;
  seriesWins: number;
  divisionAbbrev: string;
  seed: number;
  logo: string;
  darkLogo: string;
}

export interface PlayoffTeamConference {
  name: string;
  abbrev: string;
}

export interface ScheduleGame {
  id: number;
  season: number;
  gameType: GameType;
  venue: LocalizedString;
  neutralSite: boolean;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  tvBroadcasts: TvBroadcast[];
  awayTeam: WeeklyScheduleGameAwayTeam;
  homeTeam: WeeklyScheduleGameHomeTeam;
  periodDescriptor: WeeklySchedulePeriodDescriptor;
  /** Absent before the game is played */
  gameOutcome?: GameOutcome;
  /** Absent before the game is played */
  winningGoalie?: WinningGoalie;
  /** Absent before the game is played */
  winningGoalScorer?: WinningGoalie;
  /** Absent before the game is played */
  threeMinRecap?: string;
  /** Absent before the game is played */
  threeMinRecapFr?: string;
  gameCenterLink: string;
  /** Absent before the game is played */
  condensedGame?: string;
  specialEvent?: SpecialEvent;
  /** Absent before the game is played; French broadcasts only */
  condensedGameFr?: string;
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
  /** Playoff games only */
  seriesStatus?: SeriesStatus;
  /** Playoff games only */
  seriesUrl?: string;
}

export interface TeamSeasonSchedule {
  previousSeason: number;
  currentSeason: number;
  /** Absent for the current season */
  nextSeason?: number;
  clubTimezone: string;
  clubUTCOffset: string;
  games: TeamSeasonScheduleGame[];
}

export interface TeamSeasonScheduleGame {
  id: number;
  season: number;
  gameType: GameType;
  gameDate: string;
  venue: LocalizedString;
  neutralSite: boolean;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  tvBroadcasts: TvBroadcast[];
  awayTeam: TeamSeasonScheduleGameAwayTeam;
  homeTeam: ScheduleHomeTeam;
  periodDescriptor: PeriodDescriptor;
  gameOutcome?: GameOutcome;
  winningGoalie?: WinningGoalie;
  /** Absent before the game is played and for older seasons (for example, 1999-2000) */
  winningGoalScorer?: WinningGoalie;
  specialEvent?: SpecialEvent;
  gameCenterLink: string;
  /** Absent before the game is played and for older seasons (for example, 1999-2000) */
  threeMinRecap?: string;
  /** Absent before the game is played and for older seasons (for example, 1999-2000) */
  condensedGame?: string;
  /** Absent before the game is played and for older seasons (for example, 1999-2000) */
  threeMinRecapFr?: string;
  /** Playoff games only */
  seriesStatus?: SeasonScheduleSeriesStatus;
  /** Playoff games only */
  seriesUrl?: string;
  condensedGameFr?: string;
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
}

export interface TeamSeasonScheduleGameAwayTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  awaySplitSquad: boolean;
  score?: number;
  hotelLink?: string;
  hotelDesc?: string;
  airlineLink?: string;
  airlineDesc?: string;
  radioLink?: string;
  promoLink?: string;
  promoDesc?: string;
}

export interface SeasonScheduleSeriesStatus {
  round: number;
  seriesAbbrev: string;
  seriesTitle: string;
  seriesLetter: string;
  neededToWin: number;
  topSeedTeamAbbrev: string;
  topSeedWins: number;
  bottomSeedTeamAbbrev: string;
  bottomSeedWins: number;
  gameNumberOfSeries: number;
}

export interface WeeklySchedule {
  nextStartDate: string;
  previousStartDate: string;
  gameWeek: GameWeekDay[];
  preSeasonStartDate: string;
  regularSeasonStartDate: string;
  regularSeasonEndDate: string;
  playoffEndDate: string;
  numberOfGames: number;
  /** Present only while odds are published. */
  oddsPartners?: OddsPartner[];
}

export interface WeeklyScheduleGameAwayTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  awaySplitSquad: boolean;
  /** Absent before the game is played */
  score?: number;
  /** Only present before the game starts */
  radioLink?: string;
  /** Present only while odds are published for the game. */
  odds?: TeamOdd[];
}

export interface WeeklyScheduleGameHomeTeam {
  id: number;
  commonName: LocalizedString;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  homeSplitSquad: boolean;
  /** Absent before the game is played */
  score?: number;
  /** Only present before the game starts */
  radioLink?: string;
  /** Present only while odds are published for the game. */
  odds?: TeamOdd[];
}

export interface WeeklySchedulePeriodDescriptor {
  number: number;
  periodType: PeriodType;
  maxRegulationPeriods: number;
  otPeriods?: number;
}

export interface WinningGoalie {
  playerId: number;
  firstInitial: LocalizedString;
  lastName: LocalizedString;
}
