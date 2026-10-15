import type { Id } from '#src/utils.mjs';

export const PositionTypes = {
  ALL_FORWARDS: 'F',
  CENTER: 'C',
  LEFT_WING: 'L',
  RIGHT_WING: 'R',
  DEFENSE: 'D',
} as const;

export type PositionTypes = (typeof PositionTypes)[keyof typeof PositionTypes];

/** Goalie decision. W=win, L=loss, O=overtime loss. */
export type Decision = 'W' | 'L' | 'O';

export interface StatusQueryOptions {
  /** Only current active players. */
  isActive?: boolean;
  /** Only Hall of Fame players. Takes precedence over `isActive`. */
  isHallOfFame?: boolean;
}

export type Filter =
  | { kind: 'decision'; decision: Decision }
  | { kind: 'draft'; year: Id; round?: Id }
  | { kind: 'experience'; isRookie: boolean }
  | { kind: 'franchise'; franchiseId: Id }
  | { kind: 'gameType'; gameType: Id }
  | { kind: 'homeRoad'; homeRoad: string }
  | { kind: 'nationality'; nationCode: string }
  | { kind: 'opponent'; opponentId: Id }
  | { kind: 'position'; position: PositionTypes }
  | { kind: 'season'; start: Id; end: Id }
  | { kind: 'shootCatch'; shootCatch: string }
  | { kind: 'status'; isActive: boolean; isHallOfFame: boolean };

export const filter = {
  /** @param decision W, L, O */
  decision: (decision: Decision): Filter => ({ kind: 'decision', decision }),
  /**
   * @param year Draft year
   * @param round Optional draft round. The API seems to default this to "1".
   */
  draft: (year: Id, round?: Id): Filter => ({ kind: 'draft', year, round }),
  /** isRookie: true = rookies only, false = veterans only. */
  experience: (isRookie: boolean): Filter => ({
    kind: 'experience',
    isRookie,
  }),
  franchise: (franchiseId: Id): Filter => ({ kind: 'franchise', franchiseId }),
  /** @param gameType 1=Preseason, 2=Regular season, 3=Playoffs */
  gameType: (gameType: Id): Filter => ({ kind: 'gameType', gameType }),
  /** @param homeRoad H or R to indicate home or road games. */
  homeRoad: (homeRoad: string): Filter => ({ kind: 'homeRoad', homeRoad }),
  /**
   * Country/Nationality codes can be found via the `client.misc.countries()`
   * endpoint, e.g. "CAN", "USA", "SWE", "FIN", "CZE", "RUS".
   */
  nationality: (nationCode: string): Filter => ({
    kind: 'nationality',
    nationCode,
  }),
  /** @param opponentId The ID of the opponent franchise. */
  opponent: (opponentId: Id): Filter => ({ kind: 'opponent', opponentId }),
  position: (position: PositionTypes): Filter => ({
    kind: 'position',
    position,
  }),
  /** Seasons in YYYYYYYY format, e.g. 20232024. */
  season: (start: Id, end: Id): Filter => ({ kind: 'season', start, end }),
  /** @param shootCatch L or R */
  shootCatch: (shootCatch: string): Filter => ({
    kind: 'shootCatch',
    shootCatch,
  }),
  /**
   * Player status. Not supplying either option matches active and inactive
   * players.
   */
  status: ({
    isActive = false,
    isHallOfFame = false,
  }: StatusQueryOptions = {}): Filter => ({
    kind: 'status',
    isActive,
    isHallOfFame,
  }),
} as const;

export function toQuery(filter: Filter): string {
  switch (filter.kind) {
    case 'decision': {
      return `decision='${filter.decision}'`;
    }
    case 'draft': {
      return filter.round
        ? `draftYear=${filter.year} and draftRound=${filter.round}`
        : `draftYear=${filter.year}`;
    }
    case 'experience': {
      return `isRookie='${filter.isRookie ? '1' : '0'}'`;
    }
    case 'franchise': {
      return `franchiseId=${filter.franchiseId}`;
    }
    case 'gameType': {
      return `gameTypeId=${filter.gameType}`;
    }
    case 'homeRoad': {
      return `homeRoad='${filter.homeRoad}'`;
    }
    case 'nationality': {
      return `nationalityCode='${filter.nationCode}'`;
    }
    case 'opponent': {
      return `opponentFranchiseId=${filter.opponentId}`;
    }
    case 'position': {
      // All forwards require an OR clause
      if (filter.position === PositionTypes.ALL_FORWARDS) {
        return (
          `(positionCode='${PositionTypes.LEFT_WING}' ` +
          `or positionCode='${PositionTypes.RIGHT_WING}' ` +
          `or positionCode='${PositionTypes.CENTER}')`
        );
      }
      return `positionCode='${filter.position}'`;
    }
    case 'season': {
      return `seasonId >= ${filter.start} and seasonId <= ${filter.end}`;
    }
    case 'shootCatch': {
      return `shootsCatches='${filter.shootCatch}'`;
    }
    case 'status': {
      if (filter.isHallOfFame) {
        return 'isInHallOfFame=1';
      }
      if (filter.isActive) {
        return 'active=1';
      }
      return '';
    }
  }
}

/** Returns an error message if the filter is invalid, otherwise undefined. */
export function validateFilter(filter: Filter): string | undefined {
  if (
    filter.kind === 'decision' &&
    !['W', 'L', 'O'].includes(filter.decision)
  ) {
    return 'Decision value must be one of [W, L, O]';
  }
  return undefined;
}
