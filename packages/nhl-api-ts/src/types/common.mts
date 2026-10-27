// Response types derived from live NHL API probing. See CONTRIBUTING.md.

/**
 * A string union that still accepts values the SDK doesn't know about yet.
 * Autocomplete lists `Known`, but a new value from the NHL doesn't break
 * consumers.
 */
export type OpenUnion<Known extends string> = Known | (string & {});

/** A name or label with optional translations; `default` is always present. */
export interface LocalizedString {
  default: string;
  cs?: string;
  de?: string;
  es?: string;
  fi?: string;
  fr?: string;
  sk?: string;
  sv?: string;
}

/** 1 = preseason, 2 = regular season, 3 = playoffs. Other codes (4 = all-star) exist. */
export type GameType = 1 | 2 | 3 | (number & {});

/** Season in YYYYYYYY form, e.g. 20232024. */
export type SeasonId = number;

export type GameState = OpenUnion<
  'FUT' | 'PRE' | 'LIVE' | 'CRIT' | 'FINAL' | 'OFF'
>;
export type GameScheduleState = OpenUnion<
  'OK' | 'PPD' | 'SUSP' | 'CNCL' | 'TBD'
>;
export type PeriodType = OpenUnion<'REG' | 'OT' | 'SO'>;
export type PositionCode = OpenUnion<'C' | 'L' | 'R' | 'D' | 'G'>;
export type ShootsCatches = OpenUnion<'L' | 'R'>;
export type ZoneCode = OpenUnion<'O' | 'N' | 'D'>;
export type ShotType = OpenUnion<
  | 'wrist'
  | 'snap'
  | 'slap'
  | 'backhand'
  | 'tip-in'
  | 'deflected'
  | 'wrap-around'
  | 'bat'
>;

/** Envelope of the stats API (`api.nhle.com/stats/rest`) for paged reports. */
export interface StatsApiPage<Row> {
  data: Row[];
  total: number;
}

export interface GameOutcome {
  lastPeriodType: PeriodType;
  otPeriods?: number;
}

export interface PeriodDescriptor {
  number: number;
  periodType: PeriodType;
  maxRegulationPeriods: number;
  /** Absent before the game is played and for games that end in regulation */
  otPeriods?: number;
}

export interface SeriesStatus {
  round: number;
  seriesAbbrev: string;
  seriesTitle: string;
  seriesLetter: string;
  neededToWin: number;
  topSeedTeamAbbrev: string;
  topSeedWins: number;
  bottomSeedTeamAbbrev: string;
  bottomSeedWins: number;
  gameNumberOfSeries: number;
}

export interface TeamLogo {
  light: string;
  dark: string;
}

export interface TvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
}

export interface OddsPartner {
  partnerId: number;
  country: string;
  name: string;
  imageUrl: string;
  siteUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

/** A betting provider's price for one side of a game. */
export interface TeamOdd {
  providerId: number;
  value: string;
}
