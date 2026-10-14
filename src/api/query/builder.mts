import { InvalidQueryValueException } from '#src/api/query/errors.mjs';
import { QueryBase } from '#src/api/query/filters/base.mjs';

/**
 * A container for query information and validation state: the constructed
 * query string, the original filters, any validation errors and a base fact
 * query (defaults to "gamesPlayed>=1").
 */
export class QueryContext {
  readonly queryStr: string;
  readonly filters: unknown[];
  readonly errors: string[];
  readonly factQuery: string;

  constructor({
    query,
    filters,
    factQuery,
    errors = [],
  }: {
    query: string;
    filters: unknown[];
    factQuery?: string;
    errors?: string[];
  }) {
    this.queryStr = query;
    this.filters = filters;
    this.errors = errors;
    this.factQuery = factQuery ? factQuery : 'gamesPlayed>=1';
  }

  /** True if there are no validation errors. */
  isValid(): boolean {
    return this.errors.length === 0;
  }
}

/**
 * Builds and validates query strings from a list of query filters. Invalid
 * filters are skipped and their errors collected; valid filters are joined
 * with " and ".
 */
export class QueryBuilder {
  readonly debug: boolean;

  constructor({ debug = false }: { debug?: boolean } = {}) {
    this.debug = debug;
  }

  build(filters: unknown[]): QueryContext {
    let resultQuery = '';
    const outputFilters: string[] = [];
    const errors: string[] = [];

    for (const f of filters) {
      if (!(f instanceof QueryBase)) {
        if (this.debug) {
          console.error(`Input filter is not of type QueryBase: ${String(f)}`);
        }
        continue;
      }

      try {
        if (!f.validate()) {
          throw new InvalidQueryValueException(
            `Filter failed validation: ${String(f)}`,
          );
        }
      } catch (e) {
        if (!(e instanceof InvalidQueryValueException)) {
          throw e;
        }
        if (this.debug) {
          console.error(e.message);
        }
        errors.push(e.message);
        continue;
      }

      outputFilters.push(f.toQuery());
    }

    if (outputFilters.length > 0) {
      resultQuery = outputFilters.join(' and ');
    }

    return new QueryContext({ query: resultQuery, filters, errors });
  }
}
