import { QueryBase } from '#src/api/query/filters/base.mjs';
import type { Id } from '#src/utils.mjs';

export class FranchiseQuery extends QueryBase {
  readonly franchiseId: Id;
  private readonly franchiseQ = 'franchiseId';

  constructor(franchiseId: Id) {
    super();
    this.franchiseId = franchiseId;
  }

  toQuery(): string {
    return `${this.franchiseQ}=${this.franchiseId}`;
  }

  validate(): boolean {
    return true;
  }
}
