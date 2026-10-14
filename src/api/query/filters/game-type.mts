import { QueryBase } from '#src/api/query/filters/base.mjs';
import type { Id } from '#src/utils.mjs';

export class GameTypeQuery extends QueryBase {
  readonly gameType: Id;
  private readonly gameTypeQ = 'gameTypeId';

  /** @param gameType 1=Preseason, 2=Regular season, 3=Playoffs */
  constructor(gameType: Id) {
    super();
    this.gameType = gameType;
  }

  toQuery(): string {
    return `${this.gameTypeQ}=${this.gameType}`;
  }

  validate(): boolean {
    return true;
  }
}
