import { QueryBase } from '#src/api/query/filters/base.mjs';
import type { Id } from '#src/utils.mjs';

export class OpponentQuery extends QueryBase {
  readonly opponentId: Id;
  private readonly opponentQ = 'opponentFranchiseId';

  /** Opponent filter. Takes in the ID of the opponent franchise. */
  constructor(opponentFranchiseId: Id) {
    super();
    this.opponentId = opponentFranchiseId;
  }

  toQuery(): string {
    return `${this.opponentQ}=${this.opponentId}`;
  }

  validate(): boolean {
    return true;
  }
}
