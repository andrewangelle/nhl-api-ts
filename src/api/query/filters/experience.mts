import { QueryBase } from '#src/api/query/filters/base.mjs';

export class ExperienceQuery extends QueryBase {
  readonly isRookie: boolean;
  private readonly experienceQ = 'isRookie';

  /** Experience filter. true = rookies only, false = veterans only. */
  constructor(isRookie: boolean) {
    super();
    this.isRookie = isRookie;
  }

  toQuery(): string {
    const val = this.isRookie ? '1' : '0';
    return `${this.experienceQ}='${val}'`;
  }

  validate(): boolean {
    return true;
  }
}
