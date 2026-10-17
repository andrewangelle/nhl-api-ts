// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  LocalizedString,
  PositionCode,
  ShootsCatches,
} from '#src/types/common.mjs';
import type { RosterPlayer } from '#src/types/teams.mjs';

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
  /** Absent when team=TOR. Low sample count */
  birthStateProvince?: LocalizedString;
  sweaterNumber?: number;
}

export interface ProspectsGoalie {
  id: number;
  headshot: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
  /** Low sample count */
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
