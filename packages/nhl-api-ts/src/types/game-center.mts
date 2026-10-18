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
  /** Absent when game=preseason; game=shootout */
  starter?: boolean;
  evenStrengthShotsAgainst?: string;
  powerPlayShotsAgainst?: string;
  shorthandedShotsAgainst?: string;
  saveShotsAgainst?: string;
  savePctg?: number;
  evenStrengthGoalsAgainst?: number;
  powerPlayGoalsAgainst?: number;
  shorthandedGoalsAgainst?: number;
  /** Absent when game=preseason; game=shootout */
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
  /** Absent when date=now */
  threeMinRecap?: string;
  /** Absent when date=now; date=playoff. Low sample count */
  threeMinRecapFr?: string;
  /** Absent when date=now; date=playoff; date=regular. Low sample count */
  condensedGame?: string;
  /** Absent when date=now */
  clock?: GameClock;
  neutralSite: boolean;
  venueTimezone: string;
  /** Absent when date=now */
  period?: number;
  /** Absent when date=now */
  periodDescriptor?: PeriodDescriptor;
  /** Absent when date=now */
  gameOutcome?: GameOutcome;
  /** Absent when date=now */
  goals?: GameGoal[];
  /** Absent when date=playoff; date=regular. Low sample count */
  ticketsLink?: string;
  /** Absent when date=playoff; date=regular. Low sample count */
  ticketsLinkFr?: string;
  /** Absent when date=playoff; date=regular. Low sample count */
  teamLeaders?: GameTeamLeader[];
  /** Absent when date=regular. Low sample count */
  seriesStatus?: SeriesStatus;
  /** Absent when date=regular. Low sample count */
  seriesUrl?: string;
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
  /** Absent when date=regular */
  parentId?: number;
  /** Absent when date=regular. Low sample count */
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
  /** Absent when date=now */
  score?: number;
  /** Absent when date=now */
  sog?: number;
  logo: string;
  /** Absent when date=playoff; date=regular. Low sample count */
  record?: string;
  /** Absent when date=playoff; date=regular. Low sample count */
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
  /** Absent when game=preseason; game=shootout */
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
  /** Absent when date=regular. Low sample count */
  discreteClip?: number;
  /** Absent when date=regular. Low sample count */
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
  /** Absent when game=playoff */
  maxPeriods?: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
  ticketsLink?: string;
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
  ticketsLinkFr?: string;
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=preseason; game=shootout */
  highlightClipSharingUrl?: string;
  /** Absent when game=preseason; game=shootout */
  highlightClip?: number;
  /** Absent when game=preseason; game=shootout */
  pptReplayUrl?: string;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
  /** Absent when game=playoff; game=preseason; game=shootout. Low sample count */
  goalInGame?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClip?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClipFr?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  highlightClipSharingUrlFr?: string;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  highlightClipFr?: number;
}

export interface GameLandingSummary {
  scoring: GameLandingSummaryScoring[];
  threeStars: GameLandingSummaryThreeStar[];
  penalties: SummaryPenalty[];
  /** Absent when game=regular. Low sample count */
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
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  goalsAgainstAverage?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=playoff */
  maxPeriods?: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=regular */
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
  /** Absent when game=preseason; game=shootout */
  scoringPlayerTotal?: number;
  /** Absent when game=preseason; game=regular; game=shootout */
  assist1PlayerId?: number;
  /** Absent when game=preseason; game=regular; game=shootout */
  assist1PlayerTotal?: number;
  /** Absent when game=overtime; game=playoff; game=preseason; game=regular; game=shootout */
  assist2PlayerId?: number;
  /** Absent when game=overtime; game=playoff; game=preseason; game=regular; game=shootout */
  assist2PlayerTotal?: number;
  eventOwnerTeamId: number;
  /** Absent when game=playoff */
  goalieInNetId?: number;
  awayScore: number;
  homeScore: number;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: ZoneCode;
  /** Absent when game=preseason; game=shootout */
  highlightClipSharingUrl?: string;
  /** Absent when game=preseason; game=shootout */
  highlightClip?: number;
  /** Absent when game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
  goalInGame?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClip?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClipFr?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  highlightClipSharingUrlFr?: string;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Low sample count */
  gamesPlayed?: number;
  /** Low sample count */
  wins?: number;
  /** Low sample count */
  losses?: number;
  /** Low sample count */
  otLosses?: number;
  /** Low sample count */
  shotsAgainst?: number;
  /** Low sample count */
  goalsAgainst?: number;
  /** Low sample count */
  goalsAgainstAvg?: number;
  /** Low sample count */
  savePctg?: number;
  /** Low sample count */
  shutouts?: number;
  /** Low sample count */
  saves?: number;
  /** Low sample count */
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
  /** Absent when game=preseason; game=shootout */
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
  /** Low sample count */
  gamesPlayed?: number;
  /** Low sample count */
  seasonPoints?: number;
  /** Low sample count */
  record?: string;
  /** Low sample count */
  gaa?: number;
  /** Low sample count */
  savePctg?: number;
  /** Low sample count */
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
  /** Absent when game=playoff */
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
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
  teamSeasonStats?: RightRailTeamSeasonStats;
  /** Absent when game=legacy; game=overtime; game=playoff; game=preseason; game=regular; game=shootout. Low sample count */
  last10Record?: RightRailLast10Record;
  linescore?: RightRailLinescore;
  shotsByPeriod?: LinescoreByPeriod[];
  teamGameStats?: SummaryTeamGameStat[];
  gameReports?: RightRailGameReports;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  seasonSeriesFullCoverageUrl?: GameFullCoverageUrls;
  /** Absent when game=preseason; game=shootout. Low sample count */
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
  /** Absent when game=preseason; game=shootout */
  shiftChart?: string;
  toiAway: string;
  toiHome: string;
  /** Absent when game=regular. Low sample count */
  shootoutSummary?: string;
}

export interface RightRailGameVideo {
  threeMinRecap: number;
  /** Low sample count */
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
  /** Absent when game=regular. Low sample count */
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
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Absent when game=preseason; game=shootout */
  highlightClipSharingUrl?: string;
  /** Absent when game=preseason; game=shootout */
  highlightClip?: number;
  homeTeamDefendingSide?: OpenUnion<'left' | 'right'>;
  /** Absent when game=playoff; game=preseason; game=shootout. Low sample count */
  goalInGame?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClip?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  discreteClipFr?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  highlightClipSharingUrlFr?: string;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
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
  /** Low sample count */
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
  /** Low sample count */
  gamesPlayed?: number;
  /** Low sample count */
  goals?: number;
  /** Low sample count */
  assists?: number;
  /** Low sample count */
  points?: number;
  /** Low sample count */
  plusMinus?: number;
  /** Low sample count */
  pim?: number;
  /** Low sample count */
  avgPoints?: number;
  /** Low sample count */
  avgTimeOnIce?: string;
  /** Low sample count */
  gameWinningGoals?: number;
  /** Low sample count */
  shots?: number;
  /** Low sample count */
  shootingPctg?: number;
  /** Low sample count */
  faceoffWinningPctg?: number;
  /** Low sample count */
  powerPlayGoals?: number;
  /** Low sample count */
  blockedShots?: number;
  /** Low sample count */
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
  /** Absent when game=overtime; game=playoff; game=preseason; game=regular; game=shootout */
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
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
  goalsAgainstAverage?: number;
  /** Absent when game=preseason; game=regular; game=shootout. Low sample count */
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
