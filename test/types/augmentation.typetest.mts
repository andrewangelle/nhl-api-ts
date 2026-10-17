/**
 * Compile-only test (`pnpm typecheck:types`): consumers can extend the
 * response types through `declare module 'nhl-api-ts'`.
 *
 * Kept out of the `tsc -p test` program on purpose: augmentation applies to
 * the whole program, and the registry sync checks there compare the
 * registries with their unaugmented key lists.
 */
import type {
  Boxscore,
  GoalPlay,
  Play,
  PlayTypes,
  SkaterReportRows,
  TeamLogo,
} from 'nhl-api-ts';

interface PlayerOfTheDay {
  playerId: number;
  rating: number;
}

declare module 'nhl-api-ts' {
  interface Boxscore {
    someNewField?: string;
  }
  interface TeamLogo {
    sepia?: string;
  }
  interface PlayTypes {
    'new-event': { typeDescKey: 'new-event'; eventId: number; extra: string };
  }
  interface SkaterReportRows {
    myReport: PlayerOfTheDay;
  }
}

declare const boxscore: Boxscore;
declare const logo: TeamLogo;
declare const play: Play;
declare const goal: GoalPlay;
declare const row: SkaterReportRows['myReport'];

// augmented fields are typed
export const someNewField: string | undefined = boxscore.someNewField;
export const sepia: string | undefined = logo.sepia;
export const rating: number = row.rating;

// the original fields are still there
export const gameId: number = boxscore.id;
export const light: string = logo.light;
export const goalScorer: number = goal.details.scoringPlayerId;

// registries feed the unions
export const narrowed = (value: Play): string | undefined =>
  value.typeDescKey === 'new-event' ? value.extra : undefined;
export const keys: keyof PlayTypes = 'new-event';
export const reportKey: keyof SkaterReportRows = 'myReport';
export const playKey: Play['typeDescKey'] = play.typeDescKey;

// unknown fields still fail
// @ts-expect-error not declared anywhere
export const missing = boxscore.notARealField;
// @ts-expect-error not declared anywhere
export const missingLogo = logo.notARealField;
// @ts-expect-error report names are checked
export const badReport: keyof SkaterReportRows = 'not-a-report';
