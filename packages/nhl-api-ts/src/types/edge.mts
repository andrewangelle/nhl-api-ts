// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameOutcome,
  GameType,
  LocalizedString,
  PeriodDescriptor,
  PeriodType,
  PositionCode,
  ShootsCatches,
  TeamLogo,
} from '#src/types/common.mjs';

export interface EdgeLeagueAverage {
  value: number;
}

export interface CatGoalieDetail {
  player: GoalieDetailPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  stats: GoalieDetailStats;
  shotLocationSummary: CatGoalieLocationSummary[];
  shotLocationDetails: CatGoalieLocationArea[];
}

export interface CatGoalieLocationArea {
  area: string;
  saves: number | null;
  savesPercentile: number | null;
  savePctg: number | null;
  savePctgPercentile: number | null;
}

export interface CatGoalieLocationSummary {
  locationCode: string;
  goalsAgainst: number;
  goalsAgainstPercentile: number;
  goalsAgainstLeagueAvg: number;
  saves: number;
  savesPercentile: number;
  savesLeagueAvg: number;
  savePctg: number;
  savePctgPercentile: number | null;
  savePctgLeagueAvg: number;
}

export interface CatSkaterDetail {
  player: SkaterDetailPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  topShotSpeed: CatSkaterDetailTopShotSpeed;
  skatingSpeed: CatSkaterDetailSkatingSpeed;
  totalDistanceSkated: EdgePercentileMeasurement;
  sogSummary: SkaterDetailSogSummary[];
  sogDetails: SkaterDetailSogArea[];
  zoneTimeDetails: CatSkaterDetailZoneTimeDetails;
}

export interface CatSkatingSpeedOverlay {
  player: OverlayPlayer;
  timeInPeriod: string;
}

export interface CatSkaterDetailTopShotSpeed {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: Record<string, never>;
}

export interface CatSkaterDetailZoneTimeDetails {
  offensiveZonePctg: number;
  offensiveZonePercentile: number;
  offensiveZoneLeagueAvg: number;
  neutralZonePctg: number;
  neutralZonePercentile: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZonePercentile: number;
  defensiveZoneLeagueAvg: number;
}

export interface SkatingDistanceOverlay {
  player: OverlayPlayer;
  gameDate: string;
  awayTeam: OverlayTeam;
  homeTeam: OverlayTeam;
  gameOutcome: GameOutcome;
  periodDescriptor: OverlayPeriod;
  gameType: GameType;
}

export interface EdgeRankedMeasurement {
  imperial: number;
  metric: number;
  rank: number;
  leagueAvg: EdgeMeasurement;
}

export interface Goalie5v5Detail {
  savePctg5v5Last10: unknown[];
  savePctg5v5Details: Goalie5v5Details;
}

export interface Goalie5v5Details {
  savePctg: Goalie5v5Stat;
  savePctgClose: Goalie5v5Stat;
  shots: Goalie5v5Stat;
  shotsPer60: Goalie5v5Stat;
}

export interface GoalieComparison {
  player: GoalieDetailPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  shotLocationSummary: GoalieComparisonLocationSummary[];
  shotLocationDetails: GoalieComparisonLocationArea[];
  savePctg5v5Last10: unknown[];
  savePctg5v5Details: GoalieComparison5v5Details;
  savePctgLast10: unknown[];
  savePctgDetails: GoalieComparisonSaveDetails;
}

export interface GoalieComparison5v5Details {
  savePctg: number;
  savePctgClose: number;
  shots: number;
  shotsPer60: number;
}

export interface GoalieComparisonSaveDetails {
  gamesAbove900: number;
  pctgGamesAbove900: number;
  pointPctg: number;
  goalsAgainstAvg: number;
  savePctg: number;
}

export interface GoalieComparisonLocationArea {
  area: string;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePctg: number;
}

export interface GoalieComparisonLocationSummary {
  locationCode: string;
  shotsAgainst: number;
  goalsAgainst: number;
  saves: number;
  savePctg: number;
}

export interface GoalieDetail {
  player: GoalieDetailPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  stats: GoalieDetailStats;
  shotLocationSummary: GoalieLocationSummary[];
  shotLocationDetails: GoalieLocationArea[];
}

export interface GoalieDetailPlayer {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  birthDate: string;
  shootsCatches: ShootsCatches;
  sweaterNumber: number;
  slug: string;
  headshot: string;
  wins: number;
  losses: number;
  overtimeLosses: number;
  goalsAgainstAvg: number;
  savePctg: number;
  gamesPlayed: number;
  team: EdgeTeamRef;
}

export interface GoalieLocationArea {
  area: string;
  saves: number | null;
  savesPercentile: number | null;
  savePctg: number | null;
  savePctgPercentile: number | null;
}

export interface GoalieLocationSummary {
  locationCode: string;
  goalsAgainst: number;
  goalsAgainstPercentile: number;
  goalsAgainstLeagueAvg: number;
  saves: number;
  savesPercentile: number;
  savesLeagueAvg: number;
  savePctg: number;
  savePctgPercentile: number;
  savePctgLeagueAvg: number;
}

export interface GoalieDetailStats {
  goalsAgainstAvg: EdgePercentileStat;
  gamesAbove900: EdgePercentileStat;
  goalDifferentialPer60: EdgePercentileStat;
  goalSupportAvg: EdgePercentileStat;
  pointPctg: EdgePercentileStat;
}

export interface GoalieLanding {
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  /** Regular season only */
  minimumGamesPlayed?: number;
  leaders: GoalieLandingLeaders;
  /** Playoffs only */
  minimumMinutesPlayed?: number;
}

export interface GoalieLandingLeaders {
  highDangerSavePctg: HighDangerSavePctgLeader;
  highDangerSaves: HighDangerSavesLeader;
  highDangerGoalsAgainst: HighDangerGoalsAgainstLeader;
  savePctg5v5: SavePctg5v5Leader;
  gamesAbove900: GamesAbove900Leader;
}

export interface GoalieSavePercentageDetail {
  savePctgLast10: GoalieSaveLast10Game[];
  savePctgDetails: GoalieSaveDetails;
}

export interface GoalieSaveDetails {
  gamesAbove900: EdgePercentileStat;
  pctgGamesAbove900: EdgePercentileStat;
}

export interface GoalieSaveLast10Game {
  gameCenterLink: string;
  savePctg: number;
  gameDate: string;
  decision: string;
  playerOnHomeTeam: boolean;
  homeTeam: EdgeTeamRef;
  awayTeam: EdgeTeamRef;
}

export interface GoalieShotLocationDetail {
  shotLocationDetails: GoalieShotLocationArea[];
  shotLocationTotals: GoalieShotLocationTotal[];
}

export interface GoalieShotLocationArea {
  area: string;
  shotsAgainst: number | null;
  saves: number | null;
  goalsAgainst: number | null;
  savePctg: number | null;
  shotsAgainstPercentile: number;
  savesPercentile: number | null;
  goalsAgainstPercentile: number;
  savePctgPercentile: number | null;
}

export interface GoalieShotLocationTotal {
  locationCode: string;
  shotsAgainst: number;
  goalsAgainst: number;
  saves: number;
  savePctg: number;
  shotsAgainstPercentile: number;
  goalsAgainstPercentile: number;
  savesPercentile: number;
  savePctgPercentile: number;
  shotsAgainstLeagueAvg: number;
  goalsAgainstLeagueAvg: number;
  savesLeagueAvg: number;
  savePctgLeagueAvg: number;
}

export interface EdgeGameTeam {
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  teamLogo: TeamLogo;
  slug: string;
}

export interface EdgeLeaderPlayer {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
  position: string;
  slug: string;
  headshot: string;
  team: EdgeTeamRef;
}

export interface EdgeMeasurement {
  imperial: number;
  metric: number;
}

export interface HighDangerSavePctgArea {
  area: string;
  savePctg?: number;
  savePctgPercentile?: number;
}

export interface HighDangerSavesArea {
  area: string;
  saves: number;
  savesPercentile?: number;
}

export interface HighDangerSogArea {
  area: string;
  sog: number;
  sogPercentile: number;
}

export interface TeamBurstsLeader {
  team: EdgeLeaderTeam;
  bursts: number;
}

export interface DistanceMaxGameLeader {
  player: EdgeLeaderPlayer;
  distanceSkated: EdgeMeasurement;
  overlay: LandingDistanceOverlay;
}

export interface TeamDistanceLeader {
  team: EdgeLeaderTeam;
  distanceSkated: EdgeMeasurement;
}

export interface GamesAbove900Leader {
  player: EdgeLeaderPlayer;
  games: number;
}

export interface HardestShotLeader {
  player: EdgeLeaderPlayer;
  overlay: ShotSpeedOverlay;
  shotSpeed: EdgeMeasurement;
}

export interface HighDangerGoalsAgainstLeader {
  player: EdgeLeaderPlayer;
  goalsAgainst: number;
}

export interface HighDangerSavePctgLeader {
  player: EdgeLeaderPlayer;
  savePctg: number;
  shotLocationDetails: HighDangerSavePctgArea[];
}

export interface HighDangerSavesLeader {
  player: EdgeLeaderPlayer;
  saves: number;
  shotLocationDetails: HighDangerSavesArea[];
}

export interface HighDangerSogLeader {
  player: EdgeLeaderPlayer;
  sog: number;
  shotLocationDetails: HighDangerSogArea[];
}

export interface MaxSkatingSpeedLeader {
  player: EdgeLeaderPlayer;
  overlay: SkatingSpeedOverlay;
  skatingSpeed: EdgeMeasurement;
}

export interface OffensiveZoneTimeLeader {
  player: EdgeLeaderPlayer;
  zoneTime: number;
}

export interface SavePctg5v5Leader {
  player: EdgeLeaderPlayer;
  savePctg: number;
}

export interface TeamShotAttemptsLeader {
  team: EdgeLeaderTeam;
  attempts: number;
}

export interface TotalDistanceLeader {
  player: EdgeLeaderPlayer;
  distanceSkated: EdgeMeasurement;
}

export interface OverlayTeam {
  abbrev: string;
  score: number;
}

export interface OverlayPeriod {
  maxRegulationPeriods: number;
  number: number;
  periodType: PeriodType;
}

export interface OverlayPlayer {
  firstName: LocalizedString;
  lastName: LocalizedString;
}

export interface EdgeTeamRef {
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  teamLogo: TeamLogo;
}

export interface Goalie5v5Stat {
  value: number;
  leagueAvg: number;
  percentile: number;
}

export interface EdgeLeaderTeam {
  id: number;
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  teamLogo: TeamLogo;
  slug: string;
  wins: number;
  losses: number;
  otLosses: number;
}

export interface EdgeLeagueStat {
  value: number;
  leagueAvg: number;
}

export interface SkaterComparisonTopShot {
  imperial: number;
  metric: number;
  overlay: ShotSpeedOverlay;
}

export interface EdgeRankedStat {
  value: number;
  rank: number;
}

export interface TeamTopShotSpeed {
  imperial: number;
  metric: number;
  rank: number;
  leagueAvg: EdgeMeasurement;
  overlay: ShotSpeedOverlay;
}

export interface SkaterComparison {
  player: SkaterComparisonPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  shotSpeedDetails: SkaterComparisonShotSpeed;
  skatingSpeedDetails: SkaterComparisonSpeed;
  skatingDistanceLast10: SkaterComparisonDistanceGame[];
  skatingDistanceDetails: SkaterComparisonDistance;
  shotLocationDetails: SkaterComparisonLocationArea[];
  shotLocationTotals: SkaterComparisonLocationTotal[];
  zoneTimeDetails: SkaterComparisonZoneTime;
  zoneStarts: SkaterComparisonZoneStarts;
}

export interface SkaterComparisonLocationArea {
  area: string;
  sog: number;
  goals: number;
  shootingPctg?: number;
}

export interface SkaterComparisonLocationTotal {
  locationCode: string;
  sog: number;
  goals: number;
  shootingPctg: number;
}

export interface SkaterComparisonShotSpeed {
  topShotSpeed: SkaterComparisonTopShot;
  avgShotSpeed: EdgeMeasurement;
  shotAttemptsOver100: number;
  shotAttempts90To100: number;
  shotAttempts80To90: number;
  shotAttempts70To80: number;
}

export interface SkaterComparisonPlayer {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  birthDate: string;
  shootsCatches: ShootsCatches;
  sweaterNumber: number;
  position: string;
  slug: string;
  headshot: string;
  goals: number;
  assists: number;
  points: number;
  gamesPlayed: number;
  team: EdgeGameTeam;
}

export interface SkaterComparisonDistance {
  distanceTotal: EdgeMeasurement;
  distancePer60: EdgeMeasurement;
  distanceMaxGame: SkaterComparisonDistanceMaxGame;
  distanceMaxPeriod: SkaterComparisonDistanceMaxGame;
}

export interface SkaterComparisonDistanceGame {
  gameCenterLink: string;
  gameDate: string;
  playerOnHomeTeam: boolean;
  distanceSkated: EdgeMeasurement;
  toi: number;
  homeTeam: EdgeGameTeam;
  awayTeam: EdgeGameTeam;
}

export interface SkaterComparisonSpeed {
  maxSkatingSpeed: SkaterComparisonMaxSpeed;
  burstsOver22: number;
  bursts20To22: number;
  bursts18To20: number;
}

export interface SkaterComparisonZoneStarts {
  offensiveZoneStarts: number;
  neutralZoneStarts: number;
  defensiveZoneStarts: number;
}

export interface SkaterComparisonZoneTime {
  offensiveZonePctg: number;
  offensiveZoneLeagueAvg: number;
  neutralZonePctg: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZoneLeagueAvg: number;
}

export interface SkaterDetail {
  player: SkaterDetailPlayer;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  topShotSpeed: SkaterDetailTopShotSpeed;
  skatingSpeed: SkaterDetailSkatingSpeed;
  totalDistanceSkated: EdgePercentileMeasurement;
  distanceMaxGame: SkaterDetailDistanceMaxGame;
  sogSummary: SkaterDetailSogSummary[];
  sogDetails: SkaterDetailSogArea[];
  zoneTimeDetails: SkaterDetailZoneTimeDetails;
}

export interface SkaterDetailDistanceMaxGame {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: SkatingDistanceOverlay;
}

export interface SkaterDetailPlayer {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  birthDate: string;
  shootsCatches: ShootsCatches;
  sweaterNumber: number;
  position: string;
  slug: string;
  headshot: string;
  goals: number;
  assists: number;
  points: number;
  gamesPlayed: number;
  team: EdgeTeamRef;
}

export interface CatSkaterDetailSkatingSpeed {
  speedMax: CatSkaterDetailMaxSpeed;
  burstsOver20: SkaterBursts;
}

export interface SkaterDetailSkatingSpeed {
  speedMax: SkaterDetailMaxSpeed;
  burstsOver20: SkaterBursts;
}

export interface SkaterDetailSogArea {
  area: string;
  shots: number;
  shotsPercentile: number;
}

export interface SkaterDetailSogSummary {
  locationCode: string;
  shots: number;
  shotsPercentile: number;
  shotsLeagueAvg: number;
  goals: number;
  goalsPercentile: number;
  goalsLeagueAvg: number;
  shootingPctg: number;
  shootingPctgPercentile: number;
  shootingPctgLeagueAvg: number;
}

export interface SkaterDetailTopShotSpeed {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: ShotSpeedOverlay;
}

export interface SkaterDetailMaxSpeed {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: SkatingSpeedOverlay;
}

export interface EdgePercentileMeasurement {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
}

export interface SkaterDetailZoneTimeDetails {
  offensiveZonePctg: number;
  offensiveZonePercentile: number;
  offensiveZoneLeagueAvg: number;
  offensiveZoneEvPctg: number;
  offensiveZoneEvPercentile: number;
  offensiveZoneEvLeagueAvg: number;
  neutralZonePctg: number;
  neutralZonePercentile: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZonePercentile: number;
  defensiveZoneLeagueAvg: number;
}

export interface SkaterLanding {
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  leaders: SkaterLandingLeaders;
}

export interface LandingDistanceOverlay {
  player: OverlayPlayer;
  gameDate: string;
  awayTeam: OverlayTeam;
  homeTeam: OverlayTeam;
  gameOutcome: GameOutcome;
  periodDescriptor: OverlayPeriod;
  gameType: GameType;
}

export interface SkaterLandingLeaders {
  hardestShot: HardestShotLeader;
  maxSkatingSpeed: MaxSkatingSpeedLeader;
  totalDistanceSkated: TotalDistanceLeader;
  distanceMaxGame: DistanceMaxGameLeader;
  highDangerSOG: HighDangerSogLeader;
  offensiveZoneTime: OffensiveZoneTimeLeader;
  defensiveZoneTime: OffensiveZoneTimeLeader;
}

export interface SkaterShotLocationDetail {
  shotLocationDetails: SkaterShotLocationArea[];
  shotLocationTotals: SkaterShotLocationTotal[];
}

export interface SkaterShotLocationArea {
  area: string;
  sog: number;
  goals: number;
  shootingPctg: number | null;
  sogPercentile: number;
  goalsPercentile: number;
  shootingPctgPercentile: number | null;
}

export interface SkaterShotLocationTotal {
  locationCode: string;
  sog: number;
  goals: number;
  shootingPctg: number;
  sogPercentile: number;
  goalsPercentile: number;
  shootingPctgPercentile: number;
  sogLeagueAvg: number;
  goalsLeagueAvg: number;
  shootingPctgLeagueAvg: number;
}

export interface SkaterShotSpeedDetail {
  hardestShots: SkaterHardestShot[];
  shotSpeedDetails: SkaterShotSpeedBreakdown;
}

export interface SkaterHardestShot {
  gameCenterLink: string;
  gameDate: string;
  gameType: GameType;
  playerOnHomeTeam: boolean;
  shotSpeed: EdgeMeasurement;
  timeInPeriod: string;
  periodDescriptor: PeriodDescriptor;
  homeTeam: EdgeGameTeam;
  awayTeam: EdgeGameTeam;
}

export interface SkaterShotSpeedBreakdown {
  topShotSpeed: SkaterDetailTopShotSpeed;
  avgShotSpeed: EdgePercentileMeasurement;
  shotAttemptsOver100: EdgePercentileStat;
  shotAttempts90To100: EdgePercentileStat;
  shotAttempts80To90: EdgePercentileStat;
  shotAttempts70To80: EdgePercentileStat;
}

export interface SkaterSkatingDistanceDetail {
  skatingDistanceLast10: SkaterDistanceGame[];
  skatingDistanceDetails: SkaterDistanceByStrength[];
}

export interface SkaterDistanceByStrength {
  strengthCode: string;
  distanceTotal: EdgePercentileMeasurement;
  distancePer60: EdgePercentileMeasurement;
  distanceMaxGame: SkaterDistanceMaxGame;
  distanceMaxPeriod: SkaterDistanceMaxGame;
}

export interface SkaterDistanceGame {
  gameCenterLink: string;
  gameDate: string;
  playerOnHomeTeam: boolean;
  distanceSkatedAll: EdgeMeasurement;
  toiAll: number;
  distanceSkatedEven: EdgeMeasurement;
  toiEven: number;
  distanceSkatedPP?: EdgeMeasurement;
  toiPP?: number;
  distanceSkatedPK?: EdgeMeasurement;
  toiPK?: number;
  homeTeam: EdgeGameTeam;
  awayTeam: EdgeGameTeam;
}

export interface SkaterSkatingSpeedDetail {
  topSkatingSpeeds: SkaterTopSpeed[];
  skatingSpeedDetails: SkaterSpeedBreakdown;
}

export interface SkaterSpeedBreakdown {
  maxSkatingSpeed: SkaterDetailMaxSpeed;
  burstsOver22: EdgePercentileStat;
  bursts20To22: EdgePercentileStat;
  bursts18To20: EdgePercentileStat;
}

export interface SkaterTopSpeed {
  gameCenterLink: string;
  gameDate: string;
  gameType: GameType;
  playerOnHomeTeam: boolean;
  skatingSpeed: EdgeMeasurement;
  timeInPeriod: string;
  periodDescriptor: PeriodDescriptor;
  homeTeam: EdgeGameTeam;
  awayTeam: EdgeGameTeam;
}

export interface SkaterZoneTime {
  zoneTimeDetails: SkaterZoneTimeByStrength[];
  zoneStarts: SkaterZoneStarts;
}

export interface SkaterZoneStarts {
  offensiveZoneStartsPctg: number;
  offensiveZoneStartsPctgPercentile: number;
  neutralZoneStartsPctg: number;
  neutralZoneStartsPctgPercentile: number;
  defensiveZoneStartsPctg: number;
  defensiveZoneStartsPctgPercentile: number;
}

export interface SkaterZoneTimeByStrength {
  strengthCode: string;
  offensiveZonePctg: number;
  offensiveZonePercentile: number;
  offensiveZoneLeagueAvg: number;
  neutralZonePctg: number;
  neutralZonePercentile: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZonePercentile: number;
  defensiveZoneLeagueAvg: number;
}

export interface SkaterDistanceMaxGame {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: LandingDistanceOverlay;
}

export interface SkaterComparisonDistanceMaxGame {
  imperial: number;
  metric: number;
  overlay: SkatingDistanceOverlay;
}

export interface SkaterBursts {
  value: number;
  percentile: number;
  leagueAvg: EdgeLeagueAverage;
}

export interface EdgeRankedLeagueStat {
  value: number;
  rank: number;
  leagueAvg: number;
}

export interface SkaterComparisonMaxSpeed {
  imperial: number;
  metric: number;
  overlay: SkatingSpeedOverlay;
}

export interface CatSkaterDetailMaxSpeed {
  imperial: number;
  metric: number;
  percentile: number;
  leagueAvg: EdgeMeasurement;
  overlay: CatSkatingSpeedOverlay;
}

export interface SkatingSpeedOverlay {
  player: OverlayPlayer;
  gameDate: string;
  awayTeam: OverlayTeam;
  homeTeam: OverlayTeam;
  gameOutcome: GameOutcome;
  periodDescriptor: OverlayPeriod;
  timeInPeriod: string;
  gameType: GameType;
}

export interface EdgePercentileStat {
  value: number;
  percentile: number;
  leagueAvg: number;
}

export interface TeamDetail {
  team: TeamDetailInfo;
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  shotSpeed: TeamDetailShotSpeed;
  skatingSpeed: TeamDetailSkatingSpeed;
  distanceSkated: TeamDetailDistanceSkated;
  sogSummary: TeamDetailSogSummary[];
  sogDetails: TeamDetailSogArea[];
  zoneTimeDetails: TeamDetailZoneTimeDetails;
}

export interface TeamDetailDistanceSkated {
  total: EdgeRankedMeasurement;
}

export interface EdgeSeasonAvailability {
  id: number;
  gameTypes: GameType[];
}

export interface TeamDetailShotSpeed {
  shotAttemptsOver90: EdgeRankedStat;
  topShotSpeed: TeamTopShotSpeed;
}

export interface TeamSpeedMax {
  imperial: number;
  metric: number;
  rank: number;
  leagueAvg: EdgeMeasurement;
  overlay: SkatingSpeedOverlay;
}

export interface TeamDetailSkatingSpeed {
  burstsOver22: EdgeRankedStat;
  burstsOver20: TeamBursts;
  speedMax: TeamSpeedMax;
}

export interface TeamBursts {
  value: number;
  rank: number;
  leagueAvg: EdgeLeagueAverage;
}

export interface TeamDetailSogArea {
  area: string;
  shots: number;
  shotsRank: number;
}

export interface TeamDetailSogSummary {
  locationCode: string;
  shots: number;
  shotsRank: number;
  shotsLeagueAvg: number;
  shootingPctg: number;
  shootingPctgRank: number;
  shootingPctgLeagueAvg: number;
  goals: number;
  goalsRank: number;
  goalsLeagueAvg: number;
}

export interface TeamDetailInfo {
  id: number;
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  abbrev: string;
  teamLogo: TeamLogo;
  slug: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  otLosses: number;
  gamesPlayed: number;
  points: number;
}

export interface TeamDetailZoneTimeDetails {
  offensiveZonePctg: number;
  offensiveZoneRank: number;
  offensiveZoneLeagueAvg: number;
  offensiveZoneEvPctg: number;
  offensiveZoneEvRank: number;
  offensiveZoneEvLeagueAvg: number;
  neutralZonePctg: number;
  neutralZoneRank: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZoneRank: number;
  defensiveZoneLeagueAvg: number;
}

export interface TeamLanding {
  seasonsWithEdgeStats: EdgeSeasonAvailability[];
  leaders: TeamLandingLeaders;
}

export interface TeamHighDangerSogArea {
  area: string;
  sog: number;
  rank: number;
}

export interface TeamLandingLeaders {
  shotAttemptsOver90: TeamShotAttemptsLeader;
  burstsOver22: TeamBurstsLeader;
  distancePer60: TeamDistanceLeader;
  highDangerSOG: TeamHighDangerSogLeader;
  offensiveZoneTime: TeamOffensiveZoneTimeLeader;
  neutralZoneTime: TeamOffensiveZoneTimeLeader;
  defensiveZoneTime: TeamOffensiveZoneTimeLeader;
}

export interface TeamHighDangerSogLeader {
  team: EdgeLeaderTeam;
  sog: number;
  shotLocationDetails: TeamHighDangerSogArea[];
}

export interface TeamOffensiveZoneTimeLeader {
  team: EdgeLeaderTeam;
  zoneTime: number;
}

export interface TeamShotLocationDetail {
  shotLocationDetails: TeamShotLocationArea[];
  shotLocationTotals: TeamShotLocationTotal[];
}

export interface TeamShotLocationArea {
  area: string;
  sog: number;
  sogRank: number;
  goals: number;
  goalsRank: number;
  shootingPctg: number | null;
  shootingPctgRank: number | null;
}

export interface TeamShotLocationTotal {
  locationCode: string;
  position: string;
  sog: number;
  sogRank: number;
  sogLeagueAvg: number;
  goals: number;
  goalsRank: number;
  goalsLeagueAvg: number;
  shootingPctg: number;
  shootingPctgRank: number;
  shootingPctgLeagueAvg: number;
}

export interface TeamShotSpeedDetail {
  hardestShots: TeamHardestShot[];
  shotSpeedDetails: TeamShotSpeedBreakdown[];
}

export interface TeamHardestShot {
  player: TeamHardestShotPlayer;
  gameCenterLink: string;
  gameDate: string;
  gameType: GameType;
  isHomeTeam: boolean;
  shotSpeed: EdgeMeasurement;
  timeInPeriod: string;
  periodDescriptor: PeriodDescriptor;
  homeTeam: TeamShotTeamRef;
  awayTeam: TeamShotTeamRef;
}

export interface TeamShotTeamRef {
  commonName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  teamLogo: TeamLogo;
}

export interface TeamHardestShotPlayer {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  slug: string;
}

export interface TeamShotSpeedBreakdown {
  position: string;
  topShotSpeed: TeamTopShotSpeed;
  avgShotSpeed: EdgeRankedMeasurement;
  shotAttemptsOver100: EdgeRankedLeagueStat;
  shotAttempts90To100: EdgeRankedLeagueStat;
  shotAttempts80To90: EdgeLeagueStat;
  shotAttempts70To80: EdgeLeagueStat;
}

export interface TeamSkatingDistanceDetail {
  skatingDistanceLast10: TeamDistanceGame[];
  skatingDistanceDetails: TeamDistanceByStrength[];
}

export interface TeamDistanceOverlay {
  gameDate: string;
  awayTeam: OverlayTeam;
  homeTeam: OverlayTeam;
  gameOutcome: GameOutcome;
  periodDescriptor: OverlayPeriod;
  gameType: GameType;
}

export interface TeamDistanceByStrength {
  strengthCode: string;
  positionCode: PositionCode;
  distanceTotal: EdgeRankedMeasurement;
  distancePer60: EdgeRankedMeasurement;
  distanceMaxGame: TeamDistanceMaxGame;
  distanceMaxPeriod: TeamDistanceMaxGame;
}

export interface TeamDistanceMaxGame {
  imperial: number;
  metric: number;
  rank: number;
  leagueAvg: EdgeMeasurement;
  overlay: TeamDistanceOverlay;
}

export interface TeamDistanceGame {
  gameCenterLink: string;
  gameDate: string;
  isHomeTeam: boolean;
  toiAll: number;
  distanceSkatedAll: EdgeMeasurement;
  toiEven: number;
  distanceSkatedEven: EdgeMeasurement;
  toiPP?: number;
  distanceSkatedPP?: EdgeMeasurement;
  toiPK?: number;
  distanceSkatedPK?: EdgeMeasurement;
  homeTeam: TeamShotTeamRef;
  awayTeam: TeamShotTeamRef;
}

export interface TeamSkatingSpeedDetail {
  topSkatingSpeeds: TeamTopSpeed[];
  skatingSpeedDetails: TeamSpeedBreakdown[];
}

export interface TeamSpeedBreakdown {
  positionCode: PositionCode;
  maxSkatingSpeed: TeamSpeedMax;
  burstsOver22: EdgeRankedLeagueStat;
  bursts20To22: EdgeRankedLeagueStat;
  bursts18To20: EdgeRankedLeagueStat;
}

export interface TeamTopSpeed {
  player: TeamHardestShotPlayer;
  gameCenterLink: string;
  gameDate: string;
  gameType: GameType;
  isHomeTeam: boolean;
  skatingSpeed: EdgeMeasurement;
  timeInPeriod: string;
  periodDescriptor: PeriodDescriptor;
  homeTeam: TeamShotTeamRef;
  awayTeam: TeamShotTeamRef;
}

export interface TeamZoneTimeDetails {
  zoneTimeDetails: TeamZoneTimeByStrength[];
  shotDifferential: TeamShotDifferential;
}

export interface TeamShotDifferential {
  shotAttemptDifferential: number;
  shotAttemptDifferentialRank: number;
  sogDifferential: number;
  sogDifferentialRank: number;
}

export interface TeamZoneTimeByStrength {
  strengthCode: string;
  offensiveZonePctg: number;
  offensiveZoneRank: number;
  offensiveZoneLeagueAvg: number;
  neutralZonePctg: number;
  neutralZoneRank: number;
  neutralZoneLeagueAvg: number;
  defensiveZonePctg: number;
  defensiveZoneRank: number;
  defensiveZoneLeagueAvg: number;
}

export interface ShotSpeedOverlay {
  player: OverlayPlayer;
  gameDate: string;
  awayTeam: OverlayTeam;
  homeTeam: OverlayTeam;
  gameOutcome: GameOutcome;
  periodDescriptor: OverlayPeriod;
  timeInPeriod: string;
  gameType: GameType;
}
