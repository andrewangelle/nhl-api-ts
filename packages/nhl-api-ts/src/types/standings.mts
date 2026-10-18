// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type { GameType, LocalizedString } from '#src/types/common.mjs';

export interface LeagueStandings {
  wildCardIndicator: boolean;
  standings: StandingsEntry[];
  /** Only present for the current standings */
  standingsDateTimeUtc?: string;
}

export interface StandingsEntry {
  conferenceHomeSequence: number;
  conferenceL10Sequence: number;
  conferenceRoadSequence: number;
  conferenceSequence: number;
  date: string;
  divisionHomeSequence: number;
  divisionL10Sequence: number;
  divisionRoadSequence: number;
  divisionSequence: number;
  gameTypeId: GameType;
  gamesPlayed: number;
  goalDifferential: number;
  goalDifferentialPctg: number;
  goalAgainst: number;
  goalFor: number;
  goalsForPctg: number;
  homeGamesPlayed: number;
  homeGoalDifferential: number;
  homeGoalsAgainst: number;
  homeGoalsFor: number;
  homeLosses: number;
  homeOtLosses: number;
  homePoints: number;
  homeRegulationPlusOtWins: number;
  homeRegulationWins: number;
  homeTies: number;
  homeWins: number;
  l10GamesPlayed: number;
  l10GoalDifferential: number;
  l10GoalsAgainst: number;
  l10GoalsFor: number;
  l10Losses: number;
  l10OtLosses: number;
  l10Points: number;
  l10RegulationPlusOtWins: number;
  l10RegulationWins: number;
  l10Ties: number;
  l10Wins: number;
  leagueHomeSequence: number;
  leagueL10Sequence: number;
  leagueRoadSequence: number;
  leagueSequence: number;
  losses: number;
  otLosses: number;
  placeName: LocalizedString;
  pointPctg: number;
  points: number;
  regulationPlusOtWinPctg: number;
  regulationPlusOtWins: number;
  regulationWinPctg: number;
  regulationWins: number;
  roadGamesPlayed: number;
  roadGoalDifferential: number;
  roadGoalsAgainst: number;
  roadGoalsFor: number;
  roadLosses: number;
  roadOtLosses: number;
  roadPoints: number;
  roadRegulationPlusOtWins: number;
  roadRegulationWins: number;
  roadTies: number;
  roadWins: number;
  seasonId: number;
  shootoutLosses: number;
  shootoutWins: number;
  streakCode: string;
  streakCount: number;
  teamName: LocalizedString;
  teamCommonName: LocalizedString;
  teamAbbrev: LocalizedString;
  teamLogo: string;
  teamLogoDark: string;
  ties: number;
  waiversSequence: number;
  wildcardSequence: number;
  winPctg: number;
  wins: number;
  conferenceAbbrev?: string;
  conferenceName?: string;
  divisionAbbrev?: string;
  divisionName?: string;
  clinchIndicator?: string;
}

export interface StandingsSeason {
  id: number;
  conferencesInUse: boolean;
  divisionsInUse: boolean;
  pointForOTlossInUse: boolean;
  regulationWinsInUse: boolean;
  rowInUse: boolean;
  standingsEnd: string;
  standingsStart: string;
  tiesInUse: boolean;
  wildcardInUse: boolean;
}
