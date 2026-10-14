import { QueryBase } from '#src/api/query/filters/base.mjs';

/**
 * Country/Nationality codes can be found via the `client.misc.countries()`
 * endpoint, e.g. "CAN", "USA", "SWE", "FIN", "CZE", "RUS".
 */
export class NationalityQuery extends QueryBase {
  readonly nationCode: string;
  private readonly nationQ = 'nationalityCode';

  constructor(nationCode: string) {
    super();
    this.nationCode = nationCode;
  }

  validate(): boolean {
    return true;
  }

  toQuery(): string {
    return `${this.nationQ}='${this.nationCode}'`;
  }
}
