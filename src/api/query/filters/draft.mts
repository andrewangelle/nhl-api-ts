import { QueryBase } from '#src/api/query/filters/base.mjs';
import type { Id } from '#src/utils.mjs';

export class DraftQuery extends QueryBase {
  readonly year: Id;
  readonly round?: Id;
  private readonly yearQ = 'draftYear';
  private readonly roundQ = 'draftRound';

  /**
   * @param year Draft year
   * @param draftRound Optional draft round. The API seems to default this to "1".
   */
  constructor(year: Id, draftRound?: Id) {
    super();
    this.year = year;
    this.round = draftRound;
  }

  toQuery(): string {
    let query = `${this.yearQ}=${this.year}`;
    if (this.round) {
      query += ' and ';
      query += `${this.roundQ}=${this.round}`;
    }
    return query;
  }

  validate(): boolean {
    return true;
  }
}
