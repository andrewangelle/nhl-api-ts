// Response types derived from live NHL API probing. See CONTRIBUTING.md.
import type {
  GameOutcome,
  GameScheduleState,
  GameState,
  GameType,
  LocalizedString,
  OddsPartner,
  OpenUnion,
  PeriodDescriptor,
  PositionCode,
  SeriesStatus,
  ShotType,
  TeamLogo,
  TeamOdd,
  TvBroadcast,
  ZoneCode,
} from '#src/types/common.mjs';

export interface BoxscoreGoalie {
  playerId: number;
  sweaterNumber: number;
  name: LocalizedString;
  position: string;
  /** Absent for preseason games */
  starter?: boolean;
  evenStrengthShotsAgainst?: string;
  powerPlayShotsAgainst?: string;
  shorthandedShotsAgainst?: string;
  saveShotsAgainst?: string;
  savePctg?: number;
  evenStrengthGoalsAgainst?: number;
  powerPlayGoalsAgainst?: number;
  shorthandedGoalsAgainst?: number;
  /** Absent for preseason games */
  pim?: number;
  goalsAgainst?: number;
  toi?: string;
  decision?: string;
  shotsAgainst?: number;
  saves?: number;
}

export interface PastGameResult {
  opponentAbbrev: string;
  gameResult: string;
}

export interface Scratch {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
}

export interface BlockedShotDetails {
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
  blockingPlayerId: number;
  shootingPlayerId: number;
  eventOwnerTeamId: number;
  reason: OpenUnion<'blocked' | 'teammate-blocked'>;
}

export interface BlockedShotPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1441' | '1451' | '1541' | '0651'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'blocked-shot';
  sortOrder: number;
  details: BlockedShotDetails;
}

export interface Boxscore {
  id: number;
  season: number;
  gameType: GameType;
  limitedScoring: boolean;
  gameDate: string;
  venue: LocalizedString;
  venueLocation: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  regPeriods: number;
  awayTeam: BoxscoreTeam;
  homeTeam: BoxscoreTeam;
  periodDescriptor?: PeriodDescriptor;
  clock?: GameClock;
  playerByGameStats?: BoxscorePlayerByGameStats;
  gameOutcome?: GameOutcome;
}

export interface BoxscorePlayerByGameStats {
  awayTeam: BoxscoreTeamPlayers;
  homeTeam: BoxscoreTeamPlayers;
}

export interface BoxscoreSkater {
  playerId: number;
  sweaterNumber: number;
  name: LocalizedString;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  hits: number;
  powerPlayGoals: number;
  sog: number;
  faceoffWinningPctg?: number;
  toi: string;
  blockedShots: number;
  shifts: number;
  giveaways: number;
  takeaways: number;
}

export interface BoxscoreTeam {
  id: number;
  commonName: LocalizedString;
  abbrev: string;
  logo: string;
  darkLogo: string;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  score?: number;
  sog?: number;
}

export interface DailyScores {
  prevDate: string;
  currentDate: string;
  nextDate: string;
  gameWeek: DailyScoresGameWeek[];
  oddsPartners: OddsPartner[];
  games: DailyScoresGame[];
}

export interface DailyScoresGame {
  id: number;
  season: number;
  gameType: GameType;
  gameDate: string;
  venue: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: DailyScoresTvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: DailyScoresTeam;
  homeTeam: DailyScoresTeam;
  gameCenterLink: string;
  /** Absent before the game is played */
  threeMinRecap?: string;
  /** Absent before the game is played */
  threeMinRecapFr?: string;
  /** Absent before the game is played */
  condensedGame?: string;
  /** Absent before the game is played */
  clock?: GameClock;
  neutralSite: boolean;
  venueTimezone: string;
  /** Absent before the game is played */
  period?: number;
  /** Absent before the game is played */
  periodDescriptor?: PeriodDescriptor;
  /** Absent before the game is played */
  gameOutcome?: GameOutcome;
  /** Absent before the game is played */
  goals?: GameGoal[];
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
  /** Only present before the game starts */
  teamLeaders?: GameTeamLeader[];
  /** Playoff games only */
  seriesStatus?: SeriesStatus;
  /** Playoff games only */
  seriesUrl?: string;
  condensedGameFr?: string;
}

export interface DailyScoresGameWeek {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
}

export interface DailyScoresGoalAssist {
  playerId: number;
  name: LocalizedString;
  assistsToDate: number;
}

export interface DailyScoresTvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
  logoUrls?: TeamLogo;
  parentId?: number;
  languageCode?: string;
}

export interface DelayedPenaltyDetails {
  eventOwnerTeamId: number;
}

export interface DelayedPenaltyPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1451' | '1541'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'delayed-penalty';
  sortOrder: number;
  details: DelayedPenaltyDetails;
}

export interface FaceoffDetails {
  eventOwnerTeamId: number;
  losingPlayerId: number;
  winningPlayerId: number;
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
}

export interface FaceoffPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1451' | '1441' | '1541' | '0651' | '1331'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'faceoff';
  sortOrder: number;
  details: FaceoffDetails;
}

export interface DailyScoresTeam {
  id: number;
  name: LocalizedString;
  abbrev: string;
  /** Absent before the game is played */
  score?: number;
  /** Absent before the game is played */
  sog?: number;
  logo: string;
  /** Only present before the game starts */
  record?: string;
  /** Only present before the game starts */
  odds?: TeamOdd[];
}

export interface GameClock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}

export interface GameEndPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode?: OpenUnion<'0440' | '1551'>;
  homeTeamDefendingSide: OpenUnion<'right' | 'left'>;
  typeCode: number;
  typeDescKey: 'game-end';
  sortOrder: number;
}

export interface GameGoal {
  period: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  playerId: number;
  name: LocalizedString;
  firstName: LocalizedString;
  lastName: LocalizedString;
  goalModifier: string;
  assists: DailyScoresGoalAssist[];
  mugshot: string;
  teamAbbrev: string;
  goalsToDate?: number;
  awayScore: number;
  homeScore: number;
  strength: string;
  highlightClipSharingUrl?: string;
  highlightClipSharingUrlFr?: string;
  highlightClip?: number;
  highlightClipFr?: number;
  discreteClip?: number;
  discreteClipFr?: number;
  goalInGame?: number;
}

export interface GameInfoTeam {
  headCoach: LocalizedString;
  scratches: Scratch[];
}

export interface GameOfficial {
  fullName: LocalizedString;
  sweaterNumber?: number;
}

export interface GameLanding {
  id: number;
  season: number;
  gameType: GameType;
  limitedScoring: boolean;
  gameDate: string;
  venue: LocalizedString;
  venueLocation: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  tvBroadcasts: TvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: GameLandingAwayTeam;
  homeTeam: GameLandingAwayTeam;
  shootoutInUse: boolean;
  /** Absent for playoff games */
  maxPeriods?: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  /** Only present before the game starts */
  ticketsLink?: string;
  /** Only present before the game starts */
  ticketsLinkFr?: string;
  /** Only present before the game starts */
  matchup?: GameLandingMatchup;
  periodDescriptor?: PeriodDescriptor;
  summary?: GameLandingSummary;
  clock?: GameClock;
}

export interface GameLandingAwayTeam {
  id: number;
  commonName: LocalizedString;
  abbrev: string;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  logo: string;
  darkLogo: string;
  /** Only present before the game starts */
  record?: string;
  score?: number;
  sog?: number;
}

export interface GameLandingMatchup {
  season: number;
  gameType: GameType;
  skaterComparison: MatchupSkaterComparison;
  goalieComparison: MatchupGoalieComparison;
  skaterSeasonStats: MatchupSkaterSeasonStats;
  goalieSeasonStats: MatchupGoalieSeasonStats;
}

export interface GameLandingScoringGoal {
  eventId: number;
  strength: string;
  playerId: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  name: LocalizedString;
  teamAbbrev: LocalizedString;
  headshot: string;
  goalsToDate?: number;
  awayScore: number;
  homeScore: number;
  leadingTeamAbbrev?: LocalizedString;
  timeInPeriod: string;
  shotType: ShotType;
  goalModifier: string;
  assists: GoalAssist[];
  isHome: boolean;
  situationCode?: OpenUnion<'1551' | '0651' | '1331' | '0101' | '1451'>;
  /** Absent for preseason games and older seasons */
  highlightClipSharingUrl?: string;
  /** Absent for preseason games and older seasons */
  highlightClip?: number;
  /** Absent for preseason games and older seasons */
  pptReplayUrl?: string;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
  goalInGame?: number;
  discreteClip?: number;
  discreteClipFr?: number;
  highlightClipSharingUrlFr?: string;
  highlightClipFr?: number;
}

export interface GameLandingSummary {
  scoring: GameLandingSummaryScoring[];
  threeStars: GameLandingSummaryThreeStar[];
  penalties: SummaryPenalty[];
  /** Only for games decided by a shootout */
  shootout?: SummaryShootout;
}

export interface GameLandingSummaryScoring {
  periodDescriptor: PeriodDescriptor;
  goals: GameLandingScoringGoal[];
}

export interface GameLandingSummaryThreeStar {
  star: number;
  playerId: number;
  teamAbbrev: string;
  headshot: string;
  name: LocalizedString;
  sweaterNo: number;
  position: string;
  goals?: number;
  assists?: number;
  points?: number;
  /** Goalies only */
  goalsAgainstAverage?: number;
  /** Goalies only */
  savePctg?: number;
}

export interface GameStory {
  id: number;
  season: number;
  gameType: GameType;
  limitedScoring: boolean;
  gameDate: string;
  venue: LocalizedString;
  venueLocation: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  tvBroadcasts: GameStoryTvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: GameStoryAwayTeam;
  homeTeam: GameStoryAwayTeam;
  shootoutInUse: boolean;
  /** Absent for playoff games */
  maxPeriods?: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  /** Only present before the game starts */
  preGameMatchup?: PreGameMatchup;
  summary?: GameStorySummary;
  periodDescriptor?: PeriodDescriptor;
  clock?: GameClock;
}

export interface GameStoryAwayTeam {
  id: number;
  name: LocalizedString;
  abbrev: string;
  placeName: LocalizedString;
  logo: string;
  /** Only present before the game starts */
  record?: string;
  score?: number;
  sog?: number;
}

export interface PreGameMatchup {
  skatingLeaders: PreGameMatchupSkatingLeaders;
  goalieComparison: PreGameMatchupGoalieComparison;
  teamSeasonStats: PreGameMatchupTeamSeasonStats;
}

export interface GameStorySummary {
  scoring: SummaryScoring[];
  shootout: ShootoutEvent[];
  threeStars: SummaryThreeStar[];
  teamGameStats: SummaryTeamGameStat[];
}

export interface GameStoryTvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
  logoUrls?: TeamLogo;
}

export interface GameTeamLeader {
  id: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  headshot: string;
  teamAbbrev: string;
  sweaterNumber: number;
  position: string;
  category: string;
  value: number;
}

export interface GiveawayDetails {
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
  eventOwnerTeamId: number;
  playerId: number;
}

export interface GiveawayPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1541' | '1451' | '1331'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'giveaway';
  sortOrder: number;
  details: GiveawayDetails;
}

export interface GoalAssist {
  playerId: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  name: LocalizedString;
  assistsToDate: number;
  sweaterNumber: number;
}

export interface GoalDetails {
  shotType: ShotType;
  scoringPlayerId: number;
  scoringPlayerTotal?: number;
  /** Absent for unassisted goals */
  assist1PlayerId?: number;
  /** Absent for unassisted goals */
  assist1PlayerTotal?: number;
  /** Absent unless the goal had two assists */
  assist2PlayerId?: number;
  /** Absent unless the goal had two assists */
  assist2PlayerTotal?: number;
  eventOwnerTeamId: number;
  /** Absent when the net was empty */
  goalieInNetId?: number;
  awayScore: number;
  homeScore: number;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: ZoneCode;
  /** Absent for preseason games and older seasons */
  highlightClipSharingUrl?: string;
  /** Absent for preseason games and older seasons */
  highlightClip?: number;
  goalInGame?: number;
  discreteClip?: number;
  discreteClipFr?: number;
  highlightClipSharingUrlFr?: string;
  highlightClipFr?: number;
}

export interface GoalieComparisonTeam {
  teamTotals: GoalieTeamTotals;
  leaders: GoalieLeader[];
}

export interface SeasonStatsGoalie {
  playerId: number;
  teamId: number;
  sweaterNumber: number;
  name: LocalizedString;
  gamesPlayed?: number;
  wins?: number;
  losses?: number;
  otLosses?: number;
  shotsAgainst?: number;
  goalsAgainst?: number;
  goalsAgainstAvg?: number;
  savePctg?: number;
  shutouts?: number;
  saves?: number;
  toi?: string;
}

export interface GoalPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  typeCode: number;
  typeDescKey: 'goal';
  sortOrder: number;
  details: GoalDetails;
  situationCode?: OpenUnion<
    '1551' | '0651' | '1331' | '1010' | '0101' | '1451'
  >;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
  /** Absent for preseason games and older seasons */
  pptReplayUrl?: string;
}

export interface HitDetails {
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
  eventOwnerTeamId: number;
  hittingPlayerId: number;
  hitteePlayerId: number;
}

export interface HitPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1451' | '1541' | '1331' | '1441'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'hit';
  sortOrder: number;
  details: HitDetails;
}

export interface GoalieLeader {
  playerId: number;
  name: LocalizedString;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
  headshot: string;
  positionCode: PositionCode;
  gamesPlayed?: number;
  seasonPoints?: number;
  record?: string;
  gaa?: number;
  savePctg?: number;
  shutouts?: number;
}

export interface GoalieTeamTotals {
  record: string;
  gaa: number;
  savePctg: number;
  shutouts: number;
  gamesPlayed: number;
}

export interface Last10TeamRecord {
  record: string;
  streakType: string;
  streak: number;
  pastGameResults: PastGameResult[];
}

export interface SkatingLeader {
  playerId: number;
  name: LocalizedString;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
  positionCode: PositionCode;
  headshot: string;
  value: number;
}

export interface LinescoreByPeriod {
  periodDescriptor: PeriodDescriptor;
  away: number;
  home: number;
}

export interface LinescoreShootout {
  awayDecidingGoal: number;
  awayConversions: number;
  awayAttempts: number;
  homeDecidingGoal: number;
  homeConversions: number;
  homeAttempts: number;
}

export interface LinescoreTotals {
  away: number;
  home: number;
}

export interface MatchupGoalieComparison {
  contextLabel: string;
  contextSeason: number;
  homeTeam: GoalieComparisonTeam;
  awayTeam: GoalieComparisonTeam;
}

export interface MatchupGoalieSeasonStats {
  contextLabel: string;
  contextSeason: number;
  goalies: SeasonStatsGoalie[];
}

export interface MatchupSkaterComparison {
  contextLabel: string;
  contextSeason: number;
  leaders: SkatingLeadersLeader[];
}

export interface MatchupSkaterSeasonStats {
  contextLabel: string;
  contextSeason: number;
  skaters: SeasonStatsSkater[];
}

export interface MissedShotDetails {
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
  reason: OpenUnion<
    | 'hit-right-post'
    | 'wide-right'
    | 'high-and-wide-right'
    | 'wide-left'
    | 'above-crossbar'
    | 'short'
    | 'high-and-wide-left'
    | 'hit-crossbar'
    | 'hit-left-post'
  >;
  shotType: ShotType;
  shootingPlayerId: number;
  goalieInNetId: number;
  eventOwnerTeamId: number;
}

export interface MissedShotPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<
    '1551' | '1451' | '1441' | '1541' | '0651' | '1331' | '1010'
  >;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'missed-shot';
  sortOrder: number;
  details: MissedShotDetails;
}

export interface PenaltyPlayer {
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
}

export interface PenaltyDetails {
  typeCode: string;
  descKey: OpenUnion<
    | 'elbowing'
    | 'holding-obstruction'
    | 'high-sticking'
    | 'interference'
    | 'holding-the-stick'
    | 'slashing'
    | 'cross-checking'
    | 'roughing'
    | 'holding'
    | 'hooking'
    | 'fighting'
    | 'tripping'
  >;
  duration: number;
  committedByPlayerId: number;
  drawnByPlayerId: number;
  eventOwnerTeamId: number;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: ZoneCode;
}

export interface PenaltyEntry {
  timeInPeriod: string;
  type: string;
  duration: number;
  committedByPlayer: PenaltyPlayer;
  teamAbbrev: LocalizedString;
  drawnBy: PenaltyPlayer;
  descKey: OpenUnion<
    | 'elbowing'
    | 'holding-obstruction'
    | 'high-sticking'
    | 'interference'
    | 'holding-the-stick'
    | 'slashing'
    | 'cross-checking'
    | 'roughing'
    | 'holding'
    | 'hooking'
    | 'fighting'
    | 'tripping'
  >;
}

export interface PenaltyPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  typeCode: number;
  typeDescKey: 'penalty';
  sortOrder: number;
  details: PenaltyDetails;
  situationCode?: OpenUnion<'1551' | '1451' | '0641' | '1541' | '0651'>;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
}

export interface PeriodEndPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1541' | '1551' | '1331' | '1451' | '0101'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'period-end';
  sortOrder: number;
}

export interface PeriodStartPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1541' | '1331' | '1010'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'period-start';
  sortOrder: number;
}

/**
 * Play-by-play events keyed by `typeDescKey`. Augment this interface to add
 * an event type the SDK doesn't know about yet; `Play` picks it up.
 */
export interface PlayTypes {
  'blocked-shot': BlockedShotPlay;
  'delayed-penalty': DelayedPenaltyPlay;
  faceoff: FaceoffPlay;
  'game-end': GameEndPlay;
  giveaway: GiveawayPlay;
  goal: GoalPlay;
  hit: HitPlay;
  'missed-shot': MissedShotPlay;
  penalty: PenaltyPlay;
  'period-end': PeriodEndPlay;
  'period-start': PeriodStartPlay;
  'shootout-complete': ShootoutCompletePlay;
  'shot-on-goal': ShotOnGoalPlay;
  stoppage: StoppagePlay;
  takeaway: TakeawayPlay;
}

export type Play = PlayTypes[keyof PlayTypes];

export interface PlayByPlay {
  id: number;
  season: number;
  gameType: GameType;
  limitedScoring: boolean;
  gameDate: string;
  venue: LocalizedString;
  venueLocation: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: PlayByPlayTeam;
  homeTeam: PlayByPlayTeam;
  shootoutInUse: boolean;
  otInUse: boolean;
  clock: GameClock;
  displayPeriod: number;
  /** Absent for playoff games */
  maxPeriods?: number;
  plays: Play[];
  rosterSpots: PlayByPlayRosterSpot[];
  regPeriods: number;
  periodDescriptor?: PeriodDescriptor;
  gameOutcome?: GameOutcome;
  /** Empty object in every sample seen. */
  summary?: Record<string, never>;
}

export interface PlayByPlayTeam {
  id: number;
  commonName: LocalizedString;
  abbrev: string;
  score: number;
  logo: string;
  darkLogo: string;
  placeName: LocalizedString;
  placeNameWithPreposition: LocalizedString;
  sog?: number;
}

export interface PlayByPlayRosterSpot {
  teamId: number;
  playerId: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
  positionCode: PositionCode;
  headshot: string;
}

export interface BoxscoreTeamPlayers {
  forwards: BoxscoreSkater[];
  defense: BoxscoreSkater[];
  goalies: BoxscoreGoalie[];
}

export interface PreGameMatchupGoalieComparison {
  season: number;
  gameTypes: GameType[];
  awayTeam: GoalieLeader[];
  homeTeam: GoalieLeader[];
}

export interface PreGameMatchupSkatingLeaders {
  season: number;
  gameTypes: GameType[];
  gameLimit: number;
  leaders: SkatingLeadersLeader[];
}

export interface PreGameMatchupTeamSeasonStats {
  awayTeam: TeamSeasonStats;
  homeTeam: TeamSeasonStats;
}

export interface RightRail {
  seasonSeries: RightRailSeasonSeries[];
  seasonSeriesWins: RightRailSeasonSeriesWins;
  gameInfo: RightRailGameInfo;
  /** Only present before the game starts */
  teamSeasonStats?: RightRailTeamSeasonStats;
  /** Only present before the game starts */
  last10Record?: RightRailLast10Record;
  linescore?: RightRailLinescore;
  shotsByPeriod?: LinescoreByPeriod[];
  teamGameStats?: SummaryTeamGameStat[];
  gameReports?: RightRailGameReports;
  /** Playoff games only */
  seasonSeriesFullCoverageUrl?: GameFullCoverageUrls;
  gameVideo?: RightRailGameVideo;
}

export interface RightRailGameInfo {
  referees: GameOfficial[];
  linesmen: GameOfficial[];
  awayTeam: GameInfoTeam;
  homeTeam: GameInfoTeam;
}

export interface RightRailGameReports {
  gameSummary: string;
  eventSummary: string;
  playByPlay: string;
  faceoffSummary: string;
  faceoffComparison: string;
  rosters: string;
  shotSummary: string;
  /** Absent for preseason games */
  shiftChart?: string;
  toiAway: string;
  toiHome: string;
  /** Only for games decided by a shootout */
  shootoutSummary?: string;
}

export interface RightRailGameVideo {
  threeMinRecap: number;
  condensedGame?: number;
}

export interface RightRailLast10Record {
  contextLabel: string;
  contextSeason: number;
  awayTeam: Last10TeamRecord;
  homeTeam: Last10TeamRecord;
}

export interface RightRailLinescore {
  byPeriod: LinescoreByPeriod[];
  totals: LinescoreTotals;
  /** Only for games decided by a shootout */
  shootout?: LinescoreShootout;
}

export interface RightRailSeasonSeries {
  id: number;
  season: number;
  gameType: GameType;
  gameDate: string;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  gameState: GameState;
  gameScheduleState: GameScheduleState;
  awayTeam: SeasonSeriesTeam;
  homeTeam: SeasonSeriesTeam;
  periodDescriptor?: PeriodDescriptor;
  gameCenterLink: string;
  gameOutcome: GameOutcome;
}

export interface GameFullCoverageUrls {
  cs: string;
  de: string;
  fi: string;
  sv: string;
  sk: string;
  en: string;
  fr: string;
  es: string;
}

export interface RightRailSeasonSeriesWins {
  awayTeamWins: number;
  homeTeamWins: number;
  /** Playoff games only */
  neededToWin?: number;
}

export interface RightRailTeamSeasonStats {
  contextLabel: string;
  contextSeason: number;
  awayTeam: TeamSeasonStats;
  homeTeam: TeamSeasonStats;
}

export interface ScoringGoal {
  eventId: number;
  strength: string;
  playerId: number;
  firstName: LocalizedString;
  lastName: LocalizedString;
  name: LocalizedString;
  teamAbbrev: LocalizedString;
  headshot: string;
  goalsToDate?: number;
  awayScore: number;
  homeScore: number;
  leadingTeamAbbrev?: LocalizedString;
  timeInPeriod: string;
  shotType: ShotType;
  goalModifier: string;
  assists: GoalAssist[];
  isHome: boolean;
  situationCode?: OpenUnion<'1551' | '0651' | '1331' | '0101' | '1451'>;
  /** Absent for preseason games and older seasons */
  highlightClipSharingUrl?: string;
  /** Absent for preseason games and older seasons */
  highlightClip?: number;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
  goalInGame?: number;
  discreteClip?: number;
  discreteClipFr?: number;
  highlightClipSharingUrlFr?: string;
  highlightClipFr?: number;
}

export interface SeasonSeriesTeam {
  id: number;
  abbrev: string;
  logo: string;
  score?: number;
}

export interface ShiftChart {
  data: ShiftEntry[];
  total: number;
}

export interface ShiftEntry {
  id: number;
  detailCode: number;
  duration: string | null;
  endTime: string;
  eventDescription: string | null;
  eventNumber: number;
  firstName: string;
  gameId: number;
  hexValue: string;
  lastName: string;
  period: number;
  playerId: number;
  shiftNumber: number;
  startTime: string;
  teamAbbrev: string;
  teamId: number;
  teamName: string;
  typeCode: number;
  eventDetails?: string | null;
}

export interface ShootoutCompletePlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'0101'>;
  homeTeamDefendingSide: OpenUnion<'right'>;
  typeCode: number;
  typeDescKey: 'shootout-complete';
  sortOrder: number;
}

export interface ShootoutEvent {
  sequence: number;
  playerId: number;
  teamAbbrev: LocalizedString;
  firstName: LocalizedString;
  lastName: LocalizedString;
  shotType: ShotType;
  result: string;
  headshot: string;
  gameWinner: boolean;
  homeScore: number;
  awayScore: number;
}

export interface ShootoutLiveScore {
  home: number;
  away: number;
}

export interface ShotOnGoalDetails {
  shotType: ShotType;
  shootingPlayerId: number;
  goalieInNetId: number;
  eventOwnerTeamId: number;
  awaySOG: number;
  homeSOG: number;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: ZoneCode;
}

export interface ShotOnGoalPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  typeCode: number;
  typeDescKey: 'shot-on-goal';
  sortOrder: number;
  details: ShotOnGoalDetails;
  situationCode?: OpenUnion<
    '1551' | '1441' | '1541' | '1451' | '0651' | '1331' | '1010' | '0101'
  >;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
}

export interface SeasonStatsSkater {
  playerId: number;
  teamId: number;
  sweaterNumber: number;
  name: LocalizedString;
  position: string;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  points?: number;
  plusMinus?: number;
  pim?: number;
  avgPoints?: number;
  avgTimeOnIce?: string;
  gameWinningGoals?: number;
  shots?: number;
  shootingPctg?: number;
  faceoffWinningPctg?: number;
  powerPlayGoals?: number;
  blockedShots?: number;
  hits?: number;
}

export interface SkatingLeadersLeader {
  category: string;
  awayLeader: SkatingLeader;
  homeLeader: SkatingLeader;
}

export interface StoppageDetails {
  reason: OpenUnion<
    | 'offside'
    | 'puck-frozen'
    | 'puck-in-netting'
    | 'goalie-stopped-after-sog'
    | 'puck-in-benches'
    | 'icing'
    | 'referee-or-linesman'
    | 'puck-in-crowd'
    | 'net-dislodged-offensive-skater'
    | 'tv-timeout'
    | 'hand-pass'
    | 'high-stick'
    | 'visitor-timeout'
    | 'objects-on-ice'
  >;
  secondaryReason?: OpenUnion<'tv-timeout' | 'visitor-timeout'>;
}

export interface StoppagePlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1451' | '1541' | '0651' | '1441'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'stoppage';
  sortOrder: number;
  details: StoppageDetails;
}

export interface SummaryPenalty {
  periodDescriptor: PeriodDescriptor;
  penalties: PenaltyEntry[];
}

export interface SummaryScoring {
  periodDescriptor: PeriodDescriptor;
  goals: ScoringGoal[];
}

export interface SummaryShootout {
  liveScore: ShootoutLiveScore;
  events: ShootoutEvent[];
}

export interface SummaryTeamGameStat {
  category: string;
  awayValue: number | string;
  homeValue: number | string;
}

export interface SummaryThreeStar {
  star: number;
  playerId: number;
  teamAbbrev: string;
  headshot: string;
  name: string;
  sweaterNo: number;
  position: string;
  goals?: number;
  assists?: number;
  points?: number;
  /** Goalies only */
  goalsAgainstAverage?: number;
  /** Goalies only */
  savePctg?: number;
}

export interface TakeawayDetails {
  xCoord: number;
  yCoord: number;
  zoneCode: ZoneCode;
  playerId: number;
  eventOwnerTeamId: number;
}

export interface TakeawayPlay {
  eventId: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode: OpenUnion<'1551' | '1451' | '1541' | '0651' | '1331'>;
  homeTeamDefendingSide: OpenUnion<'left' | 'right'>;
  typeCode: number;
  typeDescKey: 'takeaway';
  sortOrder: number;
  details: TakeawayDetails;
}

export interface TeamSeasonStats {
  ppPctg: number;
  pkPctg: number;
  faceoffWinningPctg: number;
  goalsForPerGamePlayed: number;
  goalsAgainstPerGamePlayed: number;
  ppPctgRank: number;
  pkPctgRank: number;
  faceoffWinningPctgRank: number;
  goalsForPerGamePlayedRank: number;
  goalsAgainstPerGamePlayedRank: number;
}
