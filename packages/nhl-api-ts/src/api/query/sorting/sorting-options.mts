export interface SortExpr {
  property: string;
  direction: 'ASC' | 'DESC' | 'ASC_CI' | 'DESC_CI' | (string & {});
}

const skaterSummaryDefaultSorting: SortExpr[] = [
  { property: 'points', direction: 'DESC' },
  { property: 'gamesPlayed', direction: 'ASC' },
  { property: 'playerId', direction: 'ASC' },
];

const defaultSortingByReport = {
  summary: skaterSummaryDefaultSorting,
  bios: [
    { property: 'lastName', direction: 'ASC_CI' },
    { property: 'skaterFullName', direction: 'ASC_CI' },
    { property: 'playerId', direction: 'ASC' },
  ],
  faceoffpercentages: [
    { property: 'totalFaceoffs', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  faceoffwins: [
    { property: 'totalFaceoffWins', direction: 'DESC' },
    { property: 'faceoffWinPct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  goalsForAgainst: [
    { property: 'evenStrengthGoalDifference', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  realtime: [
    { property: 'hits', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  penalties: [
    { property: 'penaltyMinutes', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  penaltykill: [
    { property: 'shTimeOnIce', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  penaltyShots: [
    { property: 'penaltyShotsGoals', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  powerplay: [
    { property: 'ppTimeOnIce', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  puckPossessions: [
    { property: 'satPct', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  summaryshooting: [
    { property: 'satTotal', direction: 'DESC' },
    { property: 'usatTotal', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  percentages: [
    { property: 'satPercentage', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  scoringRates: [
    { property: 'pointsPer605v5', direction: 'DESC' },
    { property: 'goalsPer605v5', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  scoringpergame: [
    { property: 'pointsPerGame', direction: 'DESC' },
    { property: 'goalsPerGame', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  shootout: [
    { property: 'shootoutGoals', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  shottype: [
    { property: 'shootingPct', direction: 'DESC' },
    { property: 'shootingPctBat', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
  timeonice: [
    { property: 'timeOnIce', direction: 'DESC' },
    { property: 'playerId', direction: 'ASC' },
  ],
} satisfies Record<string, SortExpr[]>;

/** Skater report types that have a default sort configured. */
export type SkaterReportType = keyof typeof defaultSortingByReport;

const sortingLookup: Record<string, SortExpr[]> = defaultSortingByReport;

/** Skater report types that have a default sort configured. */
export const SKATER_REPORT_TYPES = Object.keys(defaultSortingByReport);

/**
 * Default sort criteria for a skater stats report. Falls back to the skater
 * summary sort for unknown report types.
 */
export function defaultSortForReport(report: string): SortExpr[] {
  return (
    (Object.hasOwn(sortingLookup, report)
      ? sortingLookup[report]
      : undefined) ?? skaterSummaryDefaultSorting
  );
}

/**
 * Default sort criteria for a team summary. Falls back to points and wins.
 */
export function defaultSortForTeamSummary(
  expr: SortExpr[] | undefined,
  isAggregate: boolean,
) {
  if (expr && expr.length > 0) {
    return expr;
  }

  return [
    { property: 'points', direction: 'DESC' },
    { property: 'wins', direction: 'DESC' },
    // aggregated rows span seasons, so they have no teamId
    {
      property: isAggregate ? 'franchiseId' : 'teamId',
      direction: 'ASC',
    },
  ];
}

/**
 * Default sort criteria for a skater stats summary. Falls back to points
 */
export function defaultSortForSkaterStatsSummary(expr: SortExpr[] | undefined) {
  if (expr && expr.length > 0) {
    return expr;
  }

  return [
    { property: 'points', direction: 'DESC' },
    { property: 'gamesPlayed', direction: 'ASC' },
    { property: 'playerId', direction: 'ASC' },
  ];
}
