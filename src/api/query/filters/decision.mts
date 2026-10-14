import { InvalidQueryValueException } from '#src/api/query/errors.mjs';
import { QueryBase } from '#src/api/query/filters/base.mjs';

export class DecisionQuery extends QueryBase {
  readonly decision: string;
  private readonly decisionQ = 'decision';

  /**
   * Decision filter. W=win, L=loss, O=overtime loss.
   * @param decision W, L, O
   */
  constructor(decision: string) {
    super();
    this.decision = decision;
  }

  toString(): string {
    return `DecisionQuery: Value=${this.decision}`;
  }

  toQuery(): string {
    return `${this.decisionQ}='${this.decision}'`;
  }

  validate(): boolean {
    if (!['W', 'L', 'O'].includes(this.decision)) {
      throw new InvalidQueryValueException(
        'Decision value must be one of [W, L, O]',
      );
    }
    return true;
  }
}
