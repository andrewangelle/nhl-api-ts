// Internal helpers for SDK methods that build their own `cayenneExp`. Not
// exported from the package: `buildQuery` / `filter` cover the report filters.

/** Quotes a value as a cayenne string literal, backslash-escaping `\` and `'`. */
export function cayenneString(value: string): string {
  return `'${value.replace(/[\\']/g, (char) => `\\${char}`)}'`;
}

/** Joins clauses with `and`, parenthesizing each when there is more than one. */
export function andClauses(clauses: readonly string[]): string {
  if (clauses.length === 1) {
    return clauses[0];
  }
  return clauses.map((clause) => `(${clause})`).join(' and ');
}
