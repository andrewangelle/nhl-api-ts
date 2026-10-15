/**
 * Typed exceptions, and a retry wrapper for transient failures.
 *
 *   node examples/error-handling.mts
 */
import { setTimeout as delay } from 'node:timers/promises';
import {
  NHLApiException,
  NHLClient,
  RateLimitExceededException,
  ResourceNotFoundException,
  ServerErrorException,
} from 'nhl-api-ts';

const isRetryable = (err: unknown): boolean =>
  err instanceof RateLimitExceededException ||
  err instanceof ServerErrorException ||
  (err instanceof DOMException && err.name === 'TimeoutError') ||
  (err instanceof TypeError && err.message === 'fetch failed');

async function withRetry<T>(
  call: () => Promise<T>,
  { attempts = 4, baseMs = 500 } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      if (attempt >= attempts || !isRetryable(err)) {
        throw err;
      }
      await delay(baseMs * 2 ** (attempt - 1) * (0.5 + Math.random()));
    }
  }
}

const client = new NHLClient();

// 404: a game id that does not exist.
try {
  await withRetry(() => client.gameCenter.boxscore({ gameId: 1 }));
} catch (err) {
  if (err instanceof ResourceNotFoundException) {
    console.log(
      `not found: ${err.message} (${err.statusCode} ${err.errorCode})`,
    );
  } else {
    throw err;
  }
}

// RangeError: invalid input is rejected before any request is made.
try {
  await client.schedule.dailySchedule({ date: '2024-02-30' });
} catch (err) {
  if (err instanceof RangeError) {
    console.log(`bad input: ${err.message}`);
  } else {
    throw err;
  }
}

// Catch-all for any HTTP failure.
try {
  const countries = await withRetry(() => client.misc.countries());
  console.log(`${countries.length} countries`);
} catch (err) {
  if (err instanceof NHLApiException) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  } else {
    throw err;
  }
}
