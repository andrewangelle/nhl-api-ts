import { QueryBase } from '#src/api/query/filters/base.mjs';
import type { Id } from '#src/utils.mjs';

export class SeasonQuery extends QueryBase {
  readonly seasonStart: Id;
  readonly seasonEnd: Id;
  private readonly seasonStartQ = 'seasonId';
  private readonly seasonStartQExp = '>=';
  private readonly seasonEndQ = 'seasonId';
  private readonly seasonEndQExp = '<=';

  /** Seasons in YYYYYYYY format, e.g. 20232024. */
  constructor(seasonStart: Id, seasonEnd: Id) {
    super();
    this.seasonStart = seasonStart;
    this.seasonEnd = seasonEnd;
  }

  toQuery(): string {
    let query = `${this.seasonStartQ} ${this.seasonStartQExp} ${this.seasonStart}`;
    query += ' and ';
    query += `${this.seasonEndQ} ${this.seasonEndQExp} ${this.seasonEnd}`;
    return query;
  }

  validate(): boolean {
    return true;
  }
}
