import { QueryBase } from '#src/api/query/filters/base.mjs';

export const PositionTypes = {
  ALL_FORWARDS: 'F',
  CENTER: 'C',
  LEFT_WING: 'L',
  RIGHT_WING: 'R',
  DEFENSE: 'D',
} as const;

export type PositionTypes = (typeof PositionTypes)[keyof typeof PositionTypes];

export class PositionQuery extends QueryBase {
  readonly position: PositionTypes;
  private readonly positionQ = 'positionCode';

  constructor(position: PositionTypes) {
    super();
    this.position = position;
  }

  toQuery(): string {
    // All forwards require an OR clause
    if (this.position === PositionTypes.ALL_FORWARDS) {
      return (
        `(${this.positionQ}='${PositionTypes.LEFT_WING}' ` +
        `or ${this.positionQ}='${PositionTypes.RIGHT_WING}' ` +
        `or ${this.positionQ}='${PositionTypes.CENTER}')`
      );
    }
    return `${this.positionQ}='${this.position}'`;
  }

  validate(): boolean {
    return true;
  }
}
