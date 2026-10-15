import type { Filter } from '#src/api/query/filters.mjs';
import { toQuery, validateFilter } from '#src/api/query/filters.mjs';

/**
 * A container for query information and validation state: the constructed
 * query string, the original filters, any validation errors and a base fact
 * query (defaults to "gamesPlayed>=1").
 */
export interface QueryContext {
  readonly query: string;
  readonly filters: readonly Filter[];
  readonly errors: readonly string[];
  readonly factQuery: string;
}

/**
 * Builds and validates a query string from a list of filters. Invalid
 * filters are skipped and their errors collected; valid filters are joined
 * with " and ".
 */
export function buildQuery(
  filters: readonly Filter[],
  factQuery = 'gamesPlayed>=1',
): QueryContext {
  const outputFilters: string[] = [];
  const errors: string[] = [];

  for (const filter of filters) {
    const error = validateFilter(filter);
    if (error) {
      errors.push(error);
      continue;
    }
    outputFilters.push(toQuery(filter));
  }

  return {
    query: outputFilters.join(' and '),
    filters,
    errors,
    factQuery,
  };
}

/** True if there are no validation errors. */
export function isValidQuery(context: QueryContext): boolean {
  return context.errors.length === 0;
}
