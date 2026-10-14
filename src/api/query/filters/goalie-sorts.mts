import type { SortExpr } from '#src/api/query/sorting/sorting-options.mjs';

/** Default sorting criteria for goalie stats reports. */
export function goalieStatsSorts(report: string): SortExpr[] {
  switch (report) {
    case 'summary':
      return [
        { property: 'wins', direction: 'DESC' },
        { property: 'gamesPlayed', direction: 'ASC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'advanced':
      return [
        { property: 'qualityStart', direction: 'DESC' },
        { property: 'goalsAgainstAverage', direction: 'ASC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'bios':
      return [
        { property: 'lastName', direction: 'ASC_CI' },
        { property: 'goalieFullName', direction: 'ASC_CI' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'daysrest':
      return [
        { property: 'wins', direction: 'DESC' },
        { property: 'savePct', direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'penaltyShots':
      return [
        { property: 'penaltyShotsSaves', direction: 'DESC' },
        { property: 'penaltyShotSavePct', direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'savesByStrength':
      return [
        { property: 'wins', direction: 'DESC' },
        { property: 'savePct', direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'shootout':
      return [
        { property: 'shootoutWins', direction: 'DESC' },
        { property: 'shootoutSavePct', direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    case 'startedVsRelieved':
      return [
        { property: 'gamesStarted', direction: 'DESC' },
        { property: 'gamesStartedSavePct', direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ];
    default:
      return [{} as SortExpr];
  }
}
