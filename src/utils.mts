import { setTimeout as delay } from 'node:timers/promises';

/** Identifiers accepted by the API: player ids, game ids, seasons, etc. */
export type Id = string | number;

/** Sleeps for the given number of seconds. */
export function sleep(seconds: number): Promise<void> {
  return delay(seconds * 1000);
}
