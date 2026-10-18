import type { SortExpr } from '#src/api/query/sorting/sorting-options.mjs';

const goalieSummaryDefaultSorting: SortExpr[] = [
  { property: 'wins', direction: 'DESC' },
  { property: 'gamesPlayed', direction: 'ASC' },
  { property: 'playerId', direction: 'ASC' },
];

/** Default sort criteria per goalie report type. */
export const goalieSortingByReport = {
  summary: goalieSummaryDefaultSorting,
  advanced: [
    { property: 'qualityStart', direction: 'DESC' },
    { property: 'goalsAgainstAverage', direction: 'ASC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  bios: [
    { property: 'lastName', direction: 'ASC_CI' },
    { property: 'goalieFullName', direction: 'ASC_CI' },
    { property: 'playerId', direction: 'ASC' },
  ],
  daysrest: [
    { property: 'wins', direction: 'DESC' },
    { property: 'savePct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  penaltyShots: [
    { property: 'penaltyShotsSaves', direction: 'DESC' },
    { property: 'penaltyShotSavePct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  savesByStrength: [
    { property: 'wins', direction: 'DESC' },
    { property: 'savePct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  shootout: [
    { property: 'shootoutWins', direction: 'DESC' },
    { property: 'shootoutSavePct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  startedVsRelieved: [
    { property: 'gamesStarted', direction: 'DESC' },
    { property: 'gamesStartedSavePct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
} satisfies Record<string, SortExpr[]>;

/** Goalie report types that have a default sort configured. */
export type GoalieReportType = keyof typeof goalieSortingByReport;

const sortingLookup: Record<string, SortExpr[]> = goalieSortingByReport;

/**
 * Default sorting criteria for goalie stats reports. Falls back to the
 * goalie summary sort for unknown report types.
 */
export function goalieStatsSorts(report: string): SortExpr[] {
  return (
    (Object.hasOwn(sortingLookup, report)
      ? sortingLookup[report]
      : undefined) ?? goalieSummaryDefaultSorting
  );
}
