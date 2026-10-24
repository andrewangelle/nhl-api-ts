// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameScheduleState,
  GameState,
  GameType,
  LocalizedString,
  PeriodDescriptor,
  PositionCode,
  ShootsCatches,
} from '#src/types/common.mjs';
import type { DailyScoresTvBroadcast } from '#src/types/game-center.mjs';

export interface Franchise {
  id: number;
  fullName: string;
  teamCommonName: string;
  teamPlaceName: string;
}

export interface Roster {
  forwards: RosterPlayer[];
  defensemen: RosterPlayer[];
  goalies: RosterPlayer[];
}

export interface RosterPlayer {
  id: number;
  headshot: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber?: number;
  positionCode: PositionCode;
  shootsCatches: ShootsCatches;
  heightInInches: number;
  weightInPounds: number;
  heightInCentimeters: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: LocalizedString;
  birthCountry: string;
  birthStateProvince?: LocalizedString;
}

export interface TeamScoreboard {
  focusedDate: string;
  focusedDateCount: number;
  clubTimeZone: string;
  clubUTCOffset: string;
  clubScheduleLink: string;
  gamesByDate: TeamScoreboardDate[];
}

export interface TeamScoreboardDate {
  date: string;
  games: TeamScoreboardGame[];
}

export interface TeamScoreboardGame {
  id: number;
  season: number;
  gameType: GameType;
  gameDate: string;
  gameCenterLink: string;
  venue: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: DailyScoresTvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: TeamScoreboardTeam;
  homeTeam: TeamScoreboardTeam;
  /** Absent before the game starts */
  period?: number;
  /** Absent before the game starts */
  periodDescriptor?: PeriodDescriptor;
  /** Absent before the game is played */
  threeMinRecap?: string;
  /** Absent before the game is played */
  threeMinRecapFr?: string;
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
}

export interface TeamScoreboardTeam {
  id: number;
  name: LocalizedString;
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  /** Absent before the game starts */
  score?: number;
  logo: string;
  /** Only present before the game starts */
  record?: string;
}
