import { setTimeout as delay } from 'node:timers/promises';

/** Identifiers accepted by the API: player ids, game ids, seasons, etc. */
export type Id = string | number;

// biome-ignore lint/suspicious/noExplicitAny: API payloads are untyped JSON
export type JsonObject = Record<string, any>;

/**
 * Serializes a value exactly like Python's `json.dumps` with default options
 * (`", "` / `": "` separators, non-ASCII escaped). The NHL stats API receives
 * sort expressions in this format from nhl-api-py, so we keep it byte-for-byte.
 */
export function pyJsonDumps(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(pyJsonDumps).join(', ')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, entryValue]) => `${pyJsonDumps(key)}: ${pyJsonDumps(entryValue)}`,
    );
    return `{${entries.join(', ')}}`;
  }
  if (value === undefined) {
    return 'null';
  }
  return JSON.stringify(value).replace(
    /[\u0080-￿]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

/** Sleeps for the given number of seconds. */
export const sleep = (seconds: number): Promise<void> => delay(seconds * 1000);
