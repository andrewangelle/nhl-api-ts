import { QueryBase } from '#src/api/query/filters/base.mjs';

export class ShootCatchesQuery extends QueryBase {
  readonly shootCatch: string;
  readonly shootCatchQ = 'shootsCatches';

  /** Shoot / catch filter. @param shootCatch L or R */
  constructor(shootCatch: string) {
    super();
    this.shootCatch = shootCatch;
  }

  toQuery(): string {
    return `${this.shootCatchQ}='${this.shootCatch}'`;
  }

  validate(): boolean {
    return true;
  }
}
