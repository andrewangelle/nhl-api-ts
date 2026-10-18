// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameType,
  LocalizedString,
  PositionCode,
  ShootsCatches,
} from '#src/types/common.mjs';

export interface AwardSeason {
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  gaa?: number;
  gameTypeId: GameType;
  gamesPlayed: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  losses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  otLosses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  savePctg?: number;
  seasonId: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  wins?: number;
  assists?: number;
  goals?: number;
  pim?: number;
  plusMinus?: number;
  points?: number;
  blockedShots?: number;
  hits?: number;
}

export interface CareerTotalsRegularSeason {
  assists: number;
  gamesPlayed: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  gamesStarted?: number;
  goals: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainst?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainstAvg?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  losses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  otLosses?: number;
  pim: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  savePctg?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shotsAgainst?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shutouts?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  timeOnIce?: string;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  wins?: number;
  gameWinningGoals?: number;
  otGoals?: number;
  plusMinus?: number;
  points?: number;
  powerPlayGoals?: number;
  powerPlayPoints?: number;
  shootingPctg?: number;
  shorthandedGoals?: number;
  shorthandedPoints?: number;
  shots?: number;
  /** Low sample count */
  avgToi?: string;
  /** Low sample count */
  faceoffWinningPctg?: number;
}

export interface ClubStatsSeason {
  season: number;
  gameTypes: GameType[];
}

export interface FeaturedRegularSeason {
  subSeason: SeasonStatLine;
  career: SeasonStatLine;
}

export interface GameLogEntry {
  gameId: number;
  teamAbbrev: string;
  homeRoadFlag: string;
  gameDate: string;
  goals: number;
  assists: number;
  commonName: LocalizedString;
  opponentCommonName: LocalizedString;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  gamesStarted?: number;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  decision?: string;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  shotsAgainst?: number;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  goalsAgainst?: number;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  savePctg?: number;
  /** Absent when player=skater,gameType=2; player=skater,gameType=3; player=veteran,gameType=2; player=veteran,gameType=3. Low sample count */
  shutouts?: number;
  pim: number;
  toi: string;
  opponentAbbrev: string;
  points?: number;
  plusMinus?: number;
  powerPlayGoals?: number;
  powerPlayPoints?: number;
  gameWinningGoals?: number;
  otGoals?: number;
  shots?: number;
  shifts?: number;
  shorthandedGoals?: number;
  shorthandedPoints?: number;
}

export interface GoalieAdvancedRow {
  completeGamePct: number;
  completeGames: number;
  gamesPlayed: number;
  gamesStarted: number;
  goalieFullName: string;
  goalsAgainst: number;
  goalsAgainstAverage: number;
  goalsFor: number;
  goalsForAverage: number;
  incompleteGames: number;
  lastName: string;
  playerId: number;
  qualityStart: number;
  qualityStartsPct: number;
  regulationLosses: number;
  regulationWins: number;
  savePct: number;
  /** Absent when statsType=advanced,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  shotsAgainstPer60: number;
  /** Absent when statsType=advanced,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIce: number;
}

export interface GoalieBiosRow {
  birthCity: string;
  birthCountryCode: string;
  birthDate: string;
  birthStateProvinceCode: string | null;
  /** Absent when statsType=bios,aggregate=true. Low sample count */
  currentTeamAbbrev?: string | null;
  draftOverall: number | null;
  draftRound: number | null;
  draftYear: number | null;
  firstSeasonForGameType: number;
  gamesPlayed: number;
  goalieFullName: string;
  height: number;
  isInHallOfFameYn: string;
  lastName: string;
  losses: number;
  nationalityCode: string;
  otLosses: number;
  playerId: number;
  shootsCatches: ShootsCatches;
  shutouts: number;
  ties: number | null;
  weight: number;
  wins: number;
}

export interface GoalieDaysRestRow {
  gamesPlayed: number;
  gamesPlayedDaysRest0: number;
  gamesPlayedDaysRest1: number;
  gamesPlayedDaysRest2: number;
  gamesPlayedDaysRest3: number;
  gamesPlayedDaysRest4Plus: number;
  gamesStarted: number;
  goalieFullName: string;
  lastName: string;
  losses: number;
  otLosses: number;
  playerId: number;
  savePct: number;
  savePctDaysRest0: number;
  savePctDaysRest1: number;
  savePctDaysRest2: number;
  savePctDaysRest3: number;
  savePctDaysRest4Plus: number;
  /** Absent when statsType=daysrest,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  /** Absent when statsType=daysrest,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  ties: number | null;
  wins: number;
}

export interface GoaliePenaltyShotsRow {
  gamesPlayed: number;
  goalieFullName: string;
  goalsAgainst: number;
  lastName: string;
  penaltyShotSavePct: number;
  penaltyShotsAgainst: number;
  penaltyShotsGoalsAgainst: number;
  penaltyShotsSaves: number;
  playerId: number;
  savePct: number;
  saves: number;
  /** Absent when statsType=penaltyShots,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  shotsAgainst: number;
  /** Absent when statsType=penaltyShots,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface GoalieSavesByStrengthRow {
  evGoalsAgainst: number;
  evSavePct: number;
  evSaves: number;
  evShotsAgainst: number;
  gamesPlayed: number;
  gamesStarted: number;
  goalieFullName: string;
  goalsAgainst: number;
  lastName: string;
  losses: number;
  otLosses: number;
  playerId: number;
  ppGoalsAgainst: number;
  ppSavePct: number;
  ppSaves: number;
  ppShotsAgainst: number;
  savePct: number;
  saves: number;
  /** Absent when statsType=savesByStrength,aggregate=true. Low sample count */
  seasonId?: number;
  shGoalsAgainst: number;
  shSavePct: number;
  shSaves: number;
  shShotsAgainst: number;
  shootsCatches: ShootsCatches;
  shotsAgainst: number;
  /** Absent when statsType=savesByStrength,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  ties: number | null;
  wins: number;
}

export interface GoalieShootoutRow {
  careerShootoutGamesPlayed: number;
  careerShootoutGoalsAllowed: number;
  careerShootoutLosses: number;
  careerShootoutSavePct: number;
  careerShootoutSaves: number;
  careerShootoutShotsAgainst: number;
  careerShootoutWins: number;
  gamesPlayed: number;
  goalieFullName: string;
  lastName: string;
  playerId: number;
  /** Absent when statsType=shootout,aggregate=true. Low sample count */
  seasonId?: number;
  shootoutGoalsAgainst: number;
  shootoutLosses: number;
  shootoutSavePct: number;
  shootoutSaves: number;
  shootoutShotsAgainst: number;
  shootoutWins: number;
  shootsCatches: ShootsCatches;
  /** Absent when statsType=shootout,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface GoalieStartedVsRelievedRow {
  gamesPlayed: number;
  gamesRelieved: number;
  gamesRelievedGoalsAgainst: number;
  gamesRelievedLosses: number;
  gamesRelievedOtLosses: number;
  gamesRelievedSavePct: number | null;
  gamesRelievedSaves: number;
  gamesRelievedShotsAgainst: number;
  gamesRelievedTies: number | null;
  gamesRelievedWins: number;
  gamesStarted: number;
  gamesStartedGoalsAgainst: number;
  gamesStartedLosses: number;
  gamesStartedOtLosses: number;
  gamesStartedSavePct: number;
  gamesStartedSaves: number;
  gamesStartedShotsAgainst: number;
  gamesStartedTies: number | null;
  gamesStartedWins: number;
  goalieFullName: string;
  lastName: string;
  losses: number;
  otLosses: number;
  playerId: number;
  savePct: number;
  /** Absent when statsType=startedVsRelieved,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  /** Absent when statsType=startedVsRelieved,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  ties: number | null;
  wins: number;
}

export interface GoalieSummaryRow {
  assists: number;
  gamesPlayed: number;
  gamesStarted: number;
  goalieFullName: string;
  goals: number;
  goalsAgainst: number;
  goalsAgainstAverage: number;
  lastName: string;
  losses: number;
  otLosses: number;
  penaltyMinutes: number;
  playerId: number;
  points: number;
  savePct: number;
  saves: number;
  /** Absent when statsType=summary,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  shotsAgainst: number;
  shutouts: number;
  /** Absent when statsType=summary,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  ties: number | null;
  timeOnIce: number;
  wins: number;
}

export interface PlayerLanding {
  playerId: number;
  isActive: boolean;
  /** Absent when player=retired */
  currentTeamId?: number;
  /** Absent when player=retired */
  currentTeamAbbrev?: string;
  /** Absent when player=retired */
  fullTeamName?: LocalizedString;
  /** Absent when player=retired */
  teamCommonName?: LocalizedString;
  /** Absent when player=retired */
  teamPlaceNameWithPreposition?: LocalizedString;
  firstName: LocalizedString;
  lastName: LocalizedString;
  badges: PlayerLandingBadge[];
  /** Absent when player=retired */
  teamLogo?: string;
  sweaterNumber: number;
  position: string;
  headshot: string;
  heroImage: string;
  heightInInches: number;
  heightInCentimeters: number;
  weightInPounds: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: LocalizedString;
  /** Absent when player=retired; player=veteran. Low sample count */
  birthStateProvince?: LocalizedString;
  birthCountry: string;
  shootsCatches: ShootsCatches;
  draftDetails: PlayerLandingDraftDetails;
  playerSlug: string;
  inTop100AllTime: number;
  inHHOF: number;
  featuredStats: PlayerLandingFeaturedStats;
  careerTotals: PlayerLandingCareerTotals;
  shopLink: string;
  twitterLink: string;
  watchLink: string;
  last5Games: PlayerLandingLast5Game[];
  seasonTotals: PlayerLandingSeasonTotal[];
  awards: PlayerLandingAward[];
  /** Absent when player=retired */
  currentTeamRoster?: PlayerLandingCurrentTeamRoster[];
}

export interface PlayerLandingAward {
  trophy: LocalizedString;
  seasons: AwardSeason[];
}

export interface PlayerLandingBadge {
  logoUrl: LocalizedString;
  title: LocalizedString;
}

export interface PlayerLandingCareerTotals {
  regularSeason: CareerTotalsRegularSeason;
  playoffs: CareerTotalsRegularSeason;
}

export interface PlayerLandingCurrentTeamRoster {
  playerId: number;
  lastName: LocalizedString;
  firstName: LocalizedString;
  playerSlug: string;
}

export interface PlayerLandingDraftDetails {
  year: number;
  teamAbbrev: string;
  round: number;
  pickInRound: number;
  overallPick: number;
}

export interface PlayerLandingFeaturedStats {
  season: number;
  regularSeason: FeaturedRegularSeason;
}

export interface PlayerLandingLast5Game {
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  decision?: string;
  gameDate: string;
  gameId: number;
  gameTypeId: GameType;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  gamesStarted?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainst?: number;
  homeRoadFlag: string;
  opponentAbbrev: string;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  penaltyMins?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  savePctg?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shotsAgainst?: number;
  teamAbbrev: string;
  toi: string;
  assists?: number;
  goals?: number;
  pim?: number;
  plusMinus?: number;
  points?: number;
  powerPlayGoals?: number;
  shifts?: number;
  shorthandedGoals?: number;
  shots?: number;
}

export interface PlayerLandingSeasonTotal {
  gameTypeId: GameType;
  gamesPlayed: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainstAvg?: number;
  leagueAbbrev: string;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  savePctg?: number;
  season: number;
  sequence: number;
  teamName: LocalizedString;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainst?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  losses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shutouts?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  ties?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  timeOnIce?: string;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  wins?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shotsAgainst?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  otLosses?: number;
  assists?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  gamesStarted?: number;
  goals?: number;
  teamCommonName?: LocalizedString;
  teamPlaceNameWithPreposition?: LocalizedString;
  pim?: number;
  points?: number;
  gameWinningGoals?: number;
  otGoals?: number;
  plusMinus?: number;
  powerPlayGoals?: number;
  powerPlayPoints?: number;
  shootingPctg?: number;
  shorthandedGoals?: number;
  shorthandedPoints?: number;
  shots?: number;
  avgToi?: string;
  faceoffWinningPctg?: number;
}

export interface SeasonStatLine {
  gamesPlayed: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  goalsAgainstAvg?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  losses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  otLosses?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  savePctg?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  shutouts?: number;
  /** Absent when player=retired; player=skater; player=veteran. Low sample count */
  wins?: number;
  assists?: number;
  gameWinningGoals?: number;
  goals?: number;
  otGoals?: number;
  pim?: number;
  plusMinus?: number;
  points?: number;
  powerPlayGoals?: number;
  powerPlayPoints?: number;
  shootingPctg?: number;
  shorthandedGoals?: number;
  shorthandedPoints?: number;
  shots?: number;
}

export interface SkaterBiosRow {
  assists: number;
  birthCity: string;
  birthCountryCode: string;
  birthDate: string;
  birthStateProvinceCode: string | null;
  /** Absent when reportType=bios,aggregate=true. Low sample count */
  currentTeamAbbrev?: string | null;
  /** Absent when reportType=bios,aggregate=true. Low sample count */
  currentTeamName?: string | null;
  draftOverall: number | null;
  draftRound: number | null;
  draftYear: number | null;
  firstSeasonForGameType: number;
  gamesPlayed: number;
  goals: number;
  height: number;
  isInHallOfFameYn: string;
  lastName: string;
  nationalityCode: string;
  playerId: number;
  points: number;
  positionCode: PositionCode;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  weight: number;
}

export interface SkaterFaceoffPercentagesRow {
  defensiveZoneFaceoffPct: number;
  defensiveZoneFaceoffs: number;
  evFaceoffPct: number;
  evFaceoffs: number;
  faceoffWinPct: number;
  gamesPlayed: number;
  lastName: string;
  neutralZoneFaceoffPct: number;
  neutralZoneFaceoffs: number;
  offensiveZoneFaceoffPct: number;
  offensiveZoneFaceoffs: number;
  playerId: number;
  positionCode: PositionCode;
  ppFaceoffPct: number;
  ppFaceoffs: number;
  /** Absent when reportType=faceoffpercentages,aggregate=true. Low sample count */
  seasonId?: number;
  shFaceoffPct: number;
  shFaceoffs: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=faceoffpercentages,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame: number;
  totalFaceoffs: number;
}

export interface SkaterFaceoffWinsRow {
  defensiveZoneFaceoffLosses: number;
  defensiveZoneFaceoffWins: number;
  defensiveZoneFaceoffs: number;
  evFaceoffs: number;
  evFaceoffsLost: number;
  evFaceoffsWon: number;
  faceoffWinPct: number;
  gamesPlayed: number;
  lastName: string;
  neutralZoneFaceoffLosses: number;
  neutralZoneFaceoffWins: number;
  neutralZoneFaceoffs: number;
  offensiveZoneFaceoffLosses: number;
  offensiveZoneFaceoffWins: number;
  offensiveZoneFaceoffs: number;
  playerId: number;
  positionCode: PositionCode;
  ppFaceoffs: number;
  ppFaceoffsLost: number;
  ppFaceoffsWon: number;
  /** Absent when reportType=faceoffwins,aggregate=true. Low sample count */
  seasonId?: number;
  shFaceoffs: number;
  shFaceoffsLost: number;
  shFaceoffsWon: number;
  skaterFullName: string;
  /** Absent when reportType=faceoffwins,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  totalFaceoffLosses: number;
  totalFaceoffWins: number;
  totalFaceoffs: number;
}

export interface SkaterGoalsForAgainstRow {
  assists: number;
  evenStrengthGoalDifference: number;
  evenStrengthGoalsAgainst: number;
  evenStrengthGoalsFor: number;
  evenStrengthGoalsForPct: number;
  evenStrengthTimeOnIcePerGame: number;
  gamesPlayed: number;
  goals: number;
  lastName: string;
  playerId: number;
  points: number;
  positionCode: PositionCode;
  powerPlayGoalFor: number;
  powerPlayGoalsAgainst: number;
  powerPlayTimeOnIcePerGame: number;
  /** Absent when reportType=goalsForAgainst,aggregate=true. Low sample count */
  seasonId?: number;
  shortHandedGoalsAgainst: number;
  shortHandedGoalsFor: number;
  shortHandedTimeOnIcePerGame: number;
  skaterFullName: string;
  /** Absent when reportType=goalsForAgainst,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterPenaltiesRow {
  assists: number;
  gameMisconductPenalties: number;
  gamesPlayed: number;
  goals: number;
  lastName: string;
  majorPenalties: number;
  matchPenalties: number;
  minorPenalties: number;
  misconductPenalties: number;
  netPenalties: number;
  netPenaltiesPer60: number;
  penalties: number;
  penaltiesDrawn: number;
  penaltiesDrawnPer60: number;
  penaltiesTakenPer60: number;
  penaltyMinutes: number;
  penaltyMinutesPerTimeOnIce: number;
  penaltySecondsPerGame: number;
  playerId: number;
  points: number;
  positionCode: PositionCode;
  /** Absent when reportType=penalties,aggregate=true. Low sample count */
  seasonId?: number;
  skaterFullName: string;
  /** Absent when reportType=penalties,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame: number;
}

export interface SkaterPenaltyKillRow {
  gamesPlayed: number;
  lastName: string;
  playerId: number;
  positionCode: PositionCode;
  ppGoalsAgainstPer60: number;
  /** Absent when reportType=penaltykill,aggregate=true. Low sample count */
  seasonId?: number;
  shAssists: number;
  shGoals: number;
  shGoalsPer60: number;
  shIndividualSatFor: number;
  shIndividualSatForPer60: number;
  shPoints: number;
  shPointsPer60: number;
  shPrimaryAssists: number;
  shPrimaryAssistsPer60: number;
  shSecondaryAssists: number;
  shSecondaryAssistsPer60: number;
  shShootingPct: number;
  shShots: number;
  shShotsPer60: number;
  shTimeOnIce: number;
  shTimeOnIcePctPerGame: number;
  shTimeOnIcePerGame: number;
  skaterFullName: string;
  /** Absent when reportType=penaltykill,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterPenaltyShotsRow {
  lastName: string;
  penaltyShotAttempts: number;
  penaltyShotShootingPct: number;
  penaltyShotsFailed: number;
  penaltyShotsGoals: number;
  playerId: number;
  positionCode: PositionCode;
  /** Absent when reportType=penaltyShots,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=penaltyShots,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterPercentagesRow {
  gamesPlayed: number;
  lastName: string;
  playerId: number;
  positionCode: PositionCode;
  satPercentage: number;
  satPercentageAhead: number | null;
  satPercentageBehind: number | null;
  satPercentageClose: number;
  satPercentageTied: number | null;
  satRelative: number;
  /** Absent when reportType=percentages,aggregate=true. Low sample count */
  seasonId?: number;
  shootingPct5v5: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  skaterSavePct5v5: number | null;
  skaterShootingPlusSavePct5v5: number | null;
  /** Absent when reportType=percentages,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame5v5: number;
  usatPercentage: number;
  usatPercentageAhead: number | null;
  usatPercentageBehind: number | null;
  usatPercentageTied: number | null;
  usatPrecentageClose: number;
  usatRelative: number;
  zoneStartPct5v5: number;
}

export interface SkaterPowerPlayRow {
  gamesPlayed: number;
  lastName: string;
  playerId: number;
  positionCode: PositionCode;
  ppAssists: number;
  ppGoals: number;
  ppGoalsForPer60: number;
  ppGoalsPer60: number;
  ppIndividualSatFor: number;
  ppIndividualSatForPer60: number;
  ppPoints: number;
  ppPointsPer60: number;
  ppPrimaryAssists: number;
  ppPrimaryAssistsPer60: number;
  ppSecondaryAssists: number;
  ppSecondaryAssistsPer60: number;
  ppShootingPct: number;
  ppShots: number;
  ppShotsPer60: number;
  ppTimeOnIce: number;
  ppTimeOnIcePctPerGame: number;
  ppTimeOnIcePerGame: number;
  /** Absent when reportType=powerplay,aggregate=true. Low sample count */
  seasonId?: number;
  skaterFullName: string;
  /** Absent when reportType=powerplay,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterPuckPossessionsRow {
  defensiveZoneStartPct: number;
  faceoffPct5v5: number | null;
  gamesPlayed: number;
  goalsPct: number | null;
  individualSatForPer60: number;
  individualShotsForPer60: number;
  lastName: string;
  neutralZoneStartPct: number;
  offensiveZoneStartPct: number;
  offensiveZoneStartRatio: number;
  onIceShootingPct: number;
  playerId: number;
  positionCode: PositionCode;
  satPct: number;
  /** Absent when reportType=puckPossessions,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=puckPossessions,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame5v5: number;
  usatPct: number;
}

export interface SkaterRealtimeRow {
  blockedShots: number;
  blockedShotsPer60: number;
  emptyNetAssists: number;
  emptyNetGoals: number;
  emptyNetPoints: number;
  firstGoals: number;
  gamesPlayed: number;
  giveaways: number;
  giveawaysPer60: number;
  hits: number;
  hitsPer60: number;
  lastName: string;
  missedShotCrossbar: number;
  missedShotFailedBankAttempt: number | null;
  missedShotGoalpost: number;
  missedShotOverNet: number;
  missedShotShort: number | null;
  missedShotWideOfNet: number;
  missedShots: number;
  otGoals: number;
  playerId: number;
  positionCode: PositionCode;
  /** Absent when reportType=realtime,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  shotAttemptsBlocked: number;
  skaterFullName: string;
  takeaways: number;
  takeawaysPer60: number;
  /** Absent when reportType=realtime,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame: number;
  totalShotAttempts: number;
}

export interface SkaterScoringPerGameRow {
  assists: number;
  assistsPerGame: number;
  blockedShots: number;
  blocksPerGame: number;
  gamesPlayed: number;
  goals: number;
  goalsPerGame: number;
  hits: number;
  hitsPerGame: number;
  lastName: string;
  penaltyMinutes: number;
  penaltyMinutesPerGame: number;
  playerId: number;
  points: number;
  pointsPerGame: number;
  positionCode: PositionCode;
  primaryAssistsPerGame: number;
  /** Absent when reportType=scoringpergame,aggregate=true. Low sample count */
  seasonId?: number;
  secondaryAssistsPerGame: number;
  shootsCatches: ShootsCatches;
  shots: number;
  shotsPerGame: number;
  skaterFullName: string;
  /** Absent when reportType=scoringpergame,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIce: number;
  timeOnIcePerGame: number;
  totalPrimaryAssists: number;
  totalSecondaryAssists: number;
}

export interface SkaterScoringRatesRow {
  assists5v5: number;
  assistsPer605v5: number;
  gamesPlayed: number;
  goals5v5: number;
  goalsPer605v5: number;
  lastName: string;
  netMinorPenaltiesPer60: number;
  offensiveZoneStartPct5v5: number;
  onIceShootingPct5v5: number;
  playerId: number;
  points5v5: number;
  pointsPer605v5: number;
  positionCode: PositionCode;
  primaryAssists5v5: number;
  primaryAssistsPer605v5: number;
  satPct: number;
  satRelative5v5: number;
  /** Absent when reportType=scoringRates,aggregate=true. Low sample count */
  seasonId?: number;
  secondaryAssists5v5: number;
  secondaryAssistsPer605v5: number;
  shootingPct5v5: number;
  skaterFullName: string;
  /** Absent when reportType=scoringRates,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame5v5: number;
}

export interface SkaterShootoutRow {
  careerShootoutGameDecidingGoals: number;
  careerShootoutGamesPlayed: number;
  careerShootoutGoals: number;
  careerShootoutShootingPct: number;
  careerShootoutShots: number;
  lastName: string;
  playerId: number;
  positionCode: PositionCode;
  /** Absent when reportType=shootout,aggregate=true. Low sample count */
  seasonId?: number;
  shootoutGameDecidingGoals: number;
  shootoutGamesPlayed: number;
  shootoutGoals: number;
  shootoutShootingPct: number;
  shootoutShots: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=shootout,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterShotTypeRow {
  gamesPlayed: number;
  goals: number;
  goalsBackhand: number;
  goalsBat: number;
  goalsBetweenLegs: number;
  goalsCradle: number;
  goalsDeflected: number;
  goalsPoke: number;
  goalsSlap: number;
  goalsSnap: number;
  goalsTipIn: number;
  goalsWrapAround: number;
  goalsWrist: number;
  lastName: string;
  playerId: number;
  /** Absent when reportType=shottype,aggregate=true. Low sample count */
  seasonId?: number;
  shootingPct: number;
  shootingPctBackhand: number | null;
  shootingPctBat: number | null;
  shootingPctBetweenLegs: number | null;
  shootingPctCradle: number | null;
  shootingPctDeflected: number | null;
  shootingPctPoke: number | null;
  shootingPctSlap: number | null;
  shootingPctSnap: number | null;
  shootingPctTipIn: number | null;
  shootingPctWrapAround: number | null;
  shootingPctWrist: number | null;
  shotsOnNetBackhand: number;
  shotsOnNetBat: number;
  shotsOnNetBetweenLegs: number;
  shotsOnNetCradle: number;
  shotsOnNetDeflected: number;
  shotsOnNetPoke: number;
  shotsOnNetSlap: number;
  shotsOnNetSnap: number;
  shotsOnNetTipIn: number;
  shotsOnNetWrapAround: number;
  shotsOnNetWrist: number;
  skaterFullName: string;
  /** Absent when reportType=shottype,aggregate=true. Low sample count */
  teamAbbrevs?: string;
}

export interface SkaterSummaryRow {
  assists: number;
  evGoals: number;
  evPoints: number;
  faceoffWinPct: number;
  gameWinningGoals: number;
  gamesPlayed: number;
  goals: number;
  lastName: string;
  otGoals: number;
  penaltyMinutes: number;
  playerId: number;
  plusMinus: number;
  points: number;
  pointsPerGame: number;
  positionCode: PositionCode;
  ppGoals: number;
  ppPoints: number;
  /** Absent when aggregate=true; reportType=summary,aggregate=true. Low sample count */
  seasonId?: number;
  shGoals: number;
  shPoints: number;
  shootingPct: number;
  shootsCatches: ShootsCatches;
  shots: number;
  skaterFullName: string;
  /** Absent when aggregate=true; reportType=summary,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame: number;
}

export interface SkaterSummaryShootingRow {
  gamesPlayed: number;
  lastName: string;
  playerId: number;
  positionCode: PositionCode;
  satAgainst: number;
  satAhead: number;
  satBehind: number;
  satClose: number;
  satFor: number;
  satRelative: number;
  satTied: number;
  satTotal: number;
  /** Absent when reportType=summaryshooting,aggregate=true. Low sample count */
  seasonId?: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=summaryshooting,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIcePerGame5v5: number;
  usatAgainst: number;
  usatAhead: number;
  usatBehind: number;
  usatClose: number;
  usatFor: number;
  usatRelative: number;
  usatTied: number;
  usatTotal: number;
}

export interface SkaterTimeOnIceRow {
  evTimeOnIce: number;
  evTimeOnIcePerGame: number;
  gamesPlayed: number;
  lastName: string;
  otTimeOnIce: number;
  otTimeOnIcePerOtGame: number;
  playerId: number;
  positionCode: PositionCode;
  ppTimeOnIce: number;
  ppTimeOnIcePerGame: number;
  /** Absent when reportType=timeonice,aggregate=true. Low sample count */
  seasonId?: number;
  shTimeOnIce: number;
  shTimeOnIcePerGame: number;
  shifts: number;
  shiftsPerGame: number;
  shootsCatches: ShootsCatches;
  skaterFullName: string;
  /** Absent when reportType=timeonice,aggregate=true. Low sample count */
  teamAbbrevs?: string;
  timeOnIce: number;
  timeOnIcePerGame: number;
  timeOnIcePerShift: number;
}

export interface TeamSummaryRow {
  faceoffWinPct: number;
  gamesPlayed: number;
  goalsAgainst: number;
  goalsAgainstPerGame: number;
  goalsFor: number;
  goalsForPerGame: number;
  losses: number;
  otLosses: number;
  penaltyKillNetPct: number;
  penaltyKillPct: number;
  pointPct: number;
  points: number;
  powerPlayNetPct: number;
  powerPlayPct: number;
  regulationAndOtWins: number;
  /** Absent when isGame=false,aggregate=true; isGame=true,aggregate=true. Low sample count */
  seasonId?: number;
  shotsAgainstPerGame: number;
  shotsForPerGame: number;
  /** Absent when isGame=false,aggregate=true; isGame=true,aggregate=true. Low sample count */
  teamFullName?: string;
  /** Absent when isGame=false,aggregate=true; isGame=true,aggregate=true. Low sample count */
  teamId?: number;
  teamShutouts: number;
  ties: number | null;
  wins: number;
  winsInRegulation: number;
  winsInShootout: number;
  /** Low sample count */
  franchiseId?: number;
  /** Low sample count */
  franchiseName?: string;
}

/**
 * Skater report rows keyed by report type (the `en/skater/<report>` path).
 * Augment this interface to add a report the SDK doesn't know about yet.
 */
export interface SkaterReportRows {
  summary: SkaterSummaryRow;
  bios: SkaterBiosRow;
  faceoffpercentages: SkaterFaceoffPercentagesRow;
  faceoffwins: SkaterFaceoffWinsRow;
  goalsForAgainst: SkaterGoalsForAgainstRow;
  penalties: SkaterPenaltiesRow;
  penaltykill: SkaterPenaltyKillRow;
  penaltyShots: SkaterPenaltyShotsRow;
  percentages: SkaterPercentagesRow;
  powerplay: SkaterPowerPlayRow;
  puckPossessions: SkaterPuckPossessionsRow;
  realtime: SkaterRealtimeRow;
  scoringRates: SkaterScoringRatesRow;
  scoringpergame: SkaterScoringPerGameRow;
  shootout: SkaterShootoutRow;
  summaryshooting: SkaterSummaryShootingRow;
  shottype: SkaterShotTypeRow;
  timeonice: SkaterTimeOnIceRow;
}

/**
 * Goalie report rows keyed by report type (the `en/goalie/<report>` path).
 * Augment this interface to add a report the SDK doesn't know about yet.
 */
export interface GoalieReportRows {
  summary: GoalieSummaryRow;
  advanced: GoalieAdvancedRow;
  bios: GoalieBiosRow;
  daysrest: GoalieDaysRestRow;
  penaltyShots: GoaliePenaltyShotsRow;
  savesByStrength: GoalieSavesByStrengthRow;
  shootout: GoalieShootoutRow;
  startedVsRelieved: GoalieStartedVsRelievedRow;
}
