// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type { LocalizedString, OpenUnion } from '#src/types/common.mjs';

/** Draft prospect position. Wingers are LW / RW here, not L / R. */
export type DraftPositionCode = OpenUnion<'C' | 'LW' | 'RW' | 'D' | 'G'>;

export interface DraftRankingCategory {
  id: number;
  name: string;
  consumerKey: string;
}

export interface DraftProspect {
  lastName: string;
  firstName: string;
  positionCode: DraftPositionCode;
  shootsCatches: OpenUnion<'L' | 'R'>;
  heightInInches: number;
  weightInPounds: number;
  lastAmateurClub?: string;
  lastAmateurLeague?: string;
  birthDate: string;
  birthCity: string;
  birthStateProvince?: string;
  birthCountry: string;
  midtermRank?: number;
  finalRank?: number;
}

export interface DraftRankings {
  /** Draft year in YYYY format. */
  draftYear: number;
  categoryId: number;
  categoryKey: string;
  draftYears: number[];
  categories: DraftRankingCategory[];
  rankings: DraftProspect[];
}

export interface DraftTrackerTvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
}

export interface DraftTrackerPick {
  pickInRound: number;
  overallPick: number;
  teamId: number;
  teamAbbrev: string;
  teamFullName: LocalizedString;
  teamCommonName: LocalizedString;
  teamPlaceNameWithPreposition: LocalizedString;
  teamLogoLight: string;
  teamLogoDark: string;
  state: string;
  lastName: LocalizedString;
  firstName: LocalizedString;
  positionCode: DraftPositionCode;
}

export interface DraftTracker {
  currentDraftDate: string;
  broadcastStartTimeUTC: string;
  tvBroadcasts: DraftTrackerTvBroadcast[];
  logoUrl: string;
  logoFrUrl: string;
  uiAccentColor: string;
  round: number;
  state: string;
  picks: DraftTrackerPick[];
}

export interface DraftPick {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: number;
  teamAbbrev: string;
  teamName: LocalizedString;
  teamCommonName: LocalizedString;
  teamPlaceNameWithPreposition: LocalizedString;
  displayAbbrev: LocalizedString;
  teamLogoLight: string;
  teamLogoDark: string;
  teamPickHistory: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
  positionCode: DraftPositionCode;
  countryCode: string;
  height: number;
  weight: number;
  amateurLeague: string;
  amateurClubName?: string;
}

export interface DraftPicks {
  /** Draft year in YYYY format. */
  draftYear: number;
  draftYears: number[];
  selectableRounds: number[];
  state: string;
  picks: DraftPick[];
  broadcastStartTimeUTC?: string;
}
