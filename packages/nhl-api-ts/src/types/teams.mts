// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  LocalizedString,
  OpenUnion,
  PositionCode,
  ShootsCatches,
} from '#src/types/common.mjs';
import type { ScoreboardDate } from '#src/types/game-center.mjs';

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

/** One team of the stats API (`en/team`), past or present. */
export interface StatsTeam {
  id: number;
  /** `null` for the placeholder teams (TBD, NHL) */
  franchiseId: number | null;
  fullName: string;
  leagueId: number;
  rawTricode: string;
  triCode: string;
}

export interface StatsTeamLogo {
  id: number;
  background: OpenUnion<'light' | 'dark' | 'alt' | 'black'>;
  endSeason: number;
  secureUrl: string;
  startSeason: number;
  teamId: number;
  url: string;
}

export interface TeamScoreboard {
  focusedDate: string;
  focusedDateCount: number;
  clubTimeZone: string;
  clubUTCOffset: string;
  clubScheduleLink: string;
  gamesByDate: ScoreboardDate[];
}
