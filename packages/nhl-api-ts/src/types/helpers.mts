import type { SkaterSummaryRow } from '#src/types/stats.mjs';
import type { RosterPlayer } from '#src/types/teams.mjs';

/**
 * A rostered player as returned by `helpers.allPlayers`: the roster entry with
 * a `team` abbreviation and the localized names flattened to plain strings.
 */
export interface AllPlayersEntry
  extends Omit<RosterPlayer, 'firstName' | 'lastName'> {
  team: string;
  firstName: string;
  lastName: string;
}

/**
 * A skater summary row from `helpers.allPlayersSummaryStatistics`, merged with
 * the roster fields from `allPlayers` when the skater is on a roster.
 */
export interface PlayerSummaryStatistics
  extends SkaterSummaryRow,
    Partial<Omit<AllPlayersEntry, keyof SkaterSummaryRow>> {}
