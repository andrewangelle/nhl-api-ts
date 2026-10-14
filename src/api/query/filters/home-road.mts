import { QueryBase } from '#src/api/query/filters/base.mjs';

export class HomeRoadQuery extends QueryBase {
  readonly homeRoad: string;
  private readonly homeRoadQ = 'homeRoad';

  /** @param homeRoad H or R to indicate home or road games. */
  constructor(homeRoad: string) {
    super();
    this.homeRoad = homeRoad;
  }

  toQuery(): string {
    return `${this.homeRoadQ}='${this.homeRoad}'`;
  }

  validate(): boolean {
    return true;
  }
}
