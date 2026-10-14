import { QueryBase } from '#src/api/query/filters/base.mjs';

export interface StatusQueryOptions {
  /** Only current active players. */
  isActive?: boolean;
  /** Only Hall of Fame players. Takes precedence over `isActive`. */
  isHallOfFame?: boolean;
}

export class StatusQuery extends QueryBase {
  readonly isActive: boolean;
  readonly isHallOfFame: boolean;
  private readonly activeQ = 'active';
  private readonly hofQ = 'isInHallOfFame';

  /**
   * Player status. Not supplying either option matches active and inactive
   * players.
   */
  constructor({
    isActive = false,
    isHallOfFame = false,
  }: StatusQueryOptions = {}) {
    super();
    this.isActive = isActive;
    this.isHallOfFame = isHallOfFame;
  }

  toQuery(): string {
    if (this.isHallOfFame) {
      return `${this.hofQ}=1`;
    }
    if (this.isActive) {
      return `${this.activeQ}=1`;
    }
    return '';
  }

  validate(): boolean {
    return true;
  }
}
