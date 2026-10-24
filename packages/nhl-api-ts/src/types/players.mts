// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  LocalizedString,
  PositionCode,
  ShootsCatches,
} from '#src/types/common.mjs';
import type { RosterPlayer } from '#src/types/teams.mjs';

export interface PlayerSpotlight {
  playerId: number;
  name: LocalizedString;
  playerSlug: string;
  position: PositionCode;
  sweaterNumber: number;
  teamId: number;
  headshot: string;
  teamTriCode: string;
  teamLogo: string;
  sortId: number;
}

export interface Prospects {
  forwards: ProspectsForward[];
  defensemen: RosterPlayer[];
  goalies: ProspectsGoalie[];
}

export interface ProspectsForward {
  id: number;
  headshot: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
  positionCode: PositionCode;
  shootsCatches: ShootsCatches;
  heightInInches: number;
  weightInPounds: number;
  heightInCentimeters: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: LocalizedString;
  birthCountry: string;
  /** Only for players born in the USA or Canada */
  birthStateProvince?: LocalizedString;
  sweaterNumber?: number;
}

export interface ProspectsGoalie {
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
}

/** One row of the stats API player search (`en/players`). */
export interface StatsPlayer {
  id: number;
  currentTeamId: number | null;
  firstName: string;
  fullName: string;
  lastName: string;
  positionCode: PositionCode;
  sweaterNumber: number | null;
}
