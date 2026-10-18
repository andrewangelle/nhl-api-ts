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
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  gameOutcome?: GameOutcome;
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  winningGoalie?: WinningGoalie;
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  winningGoalScorer?: WinningGoalie;
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  threeMinRecap?: string;
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  condensedGame?: string;
  gameCenterLink: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  threeMinRecapFr?: string;
  /** Absent when team=TOR,month=now; team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now; team=UTA,week=now. Low sample count */
  condensedGameFr?: string;
  /** Absent when team=BUF,week=2024-02-10 */
  ticketsLink?: string;
  /** Absent when team=BUF,week=2024-02-10 */
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
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  score?: number;
  /** Absent when team=BUF,week=now */
  airlineLink?: string;
  /** Absent when team=BUF,week=now */
  airlineDesc?: string;
  /** Absent when team=BUF,week=now */
  hotelLink?: string;
  /** Absent when team=BUF,week=now */
  hotelDesc?: string;
  /** Absent when team=BUF,week=2024-02-10 */
  radioLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
  promoLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
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
  /** Absent when team=BUF,week=now; team=TOR,week=now; team=UTA,week=now */
  score?: number;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now */
  hotelLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now */
  hotelDesc?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
  airlineLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
  airlineDesc?: string;
  /** Absent when team=BUF,week=2024-02-10 */
  radioLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
  promoLink?: string;
  /** Absent when team=BUF,week=2024-02-10; team=BUF,week=now; team=TOR,week=now */
  promoDesc?: string;
}

export interface SpecialEvent {
  parentId: number;
  name: LocalizedString;
  /** Low sample count */
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
  /** Absent when season=20232024,series=o. Low sample count */
  conferenceAbbrev?: string;
  /** Absent when season=20232024,series=o. Low sample count */
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
  /** Absent when date=now */
  gameOutcome?: GameOutcome;
  /** Absent when date=now */
  winningGoalie?: WinningGoalie;
  /** Absent when date=now */
  winningGoalScorer?: WinningGoalie;
  /** Absent when date=now */
  threeMinRecap?: string;
  /** Absent when date=now */
  threeMinRecapFr?: string;
  gameCenterLink: string;
  /** Absent when date=now */
  condensedGame?: string;
  /** Absent when date=now; date=playoff; date=regular. Low sample count */
  specialEvent?: SpecialEvent;
  /** Absent when date=playoff; date=regular. Low sample count */
  ticketsLink?: string;
  /** Absent when date=playoff; date=regular. Low sample count */
  ticketsLinkFr?: string;
  /** Absent when date=regular. Low sample count */
  seriesStatus?: SeriesStatus;
  /** Absent when date=regular. Low sample count */
  seriesUrl?: string;
}

export interface TeamSeasonSchedule {
  previousSeason: number;
  currentSeason: number;
  /** Absent when team=BUF,season=now; team=TOR,season=now; team=UTA,season=now */
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
  /** Absent when team=BUF,season=19992000 */
  winningGoalScorer?: WinningGoalie;
  /** Absent when team=BUF,season=19992000; team=BUF,season=now; team=TOR,season=now */
  specialEvent?: SpecialEvent;
  gameCenterLink: string;
  /** Absent when team=BUF,season=19992000 */
  threeMinRecap?: string;
  /** Absent when team=BUF,season=19992000 */
  condensedGame?: string;
  /** Absent when team=BUF,season=19992000 */
  threeMinRecapFr?: string;
  /** Absent when team=BUF,season=20232024; team=BUF,season=now; team=SEA,season=20232024; team=TOR,season=now; team=UTA,season=now. Low sample count */
  seriesStatus?: SeasonScheduleSeriesStatus;
  /** Absent when team=BUF,season=20232024; team=BUF,season=now; team=SEA,season=20232024; team=TOR,season=now; team=UTA,season=now. Low sample count */
  seriesUrl?: string;
  /** Absent when team=SEA,season=20232024 */
  condensedGameFr?: string;
  /** Absent when team=SEA,season=20232024 */
  ticketsLink?: string;
  /** Absent when team=SEA,season=20232024 */
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
  /** Absent when team=BUF,season=19992000 */
  hotelLink?: string;
  /** Absent when team=BUF,season=19992000 */
  hotelDesc?: string;
  /** Absent when team=BUF,season=19992000 */
  airlineLink?: string;
  /** Absent when team=BUF,season=19992000 */
  airlineDesc?: string;
  /** Absent when team=SEA,season=20232024 */
  radioLink?: string;
  /** Absent when team=SEA,season=20232024 */
  promoLink?: string;
  /** Absent when team=SEA,season=20232024 */
  promoDesc?: string;
}

export interface SeasonScheduleSeriesStatus {
  round: number;
  seriesAbbrev: string;
  seriesTitle: string;
  seriesLetter: string;
  neededToWin: number;
  topSeedWins: number;
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
  /** Absent when date=now */
  score?: number;
  /** Absent when date=playoff; date=regular. Low sample count */
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
  /** Absent when date=now */
  score?: number;
  /** Absent when date=playoff; date=regular. Low sample count */
  radioLink?: string;
  /** Present only while odds are published for the game. */
  odds?: TeamOdd[];
}

export interface WeeklySchedulePeriodDescriptor {
  number: number;
  periodType: PeriodType;
  maxRegulationPeriods: number;
  /** Absent when date=regular. Low sample count */
  otPeriods?: number;
}

export interface WinningGoalie {
  playerId: number;
  firstInitial: LocalizedString;
  lastName: LocalizedString;
}
