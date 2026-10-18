# Retry on rate limits and server errors

The SDK makes exactly one attempt per call. Wrap calls yourself when you loop
over many teams, players or games.

```ts
import {
  createNHLClient,
  NHLApiException,
  RateLimitExceededException,
  ServerErrorException,
} from 'nhl-api-ts';
import { setTimeout as delay } from 'node:timers/promises';

const isRetryable = (err: unknown): boolean =>
  err instanceof RateLimitExceededException ||
  err instanceof ServerErrorException ||
  (err instanceof DOMException && err.name === 'TimeoutError') ||
  (err instanceof TypeError && err.message === 'fetch failed');

export async function withRetry<T>(
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
      // exponential backoff with jitter: 500ms, 1s, 2s, ...
      await delay(baseMs * 2 ** (attempt - 1) * (0.5 + Math.random()));
    }
  }
}

const client = createNHLClient();
const boxscore = await withRetry(() =>
  client.gameCenter.boxscore({ gameId: 2023020280 }),
);
```

## What to retry

| Error                                   | Retry? | Why                                            |
| --------------------------------------- | ------ | ---------------------------------------------- |
| `RateLimitExceededException` (429)      | yes    | Back off first                                 |
| `ServerErrorException` (5xx)            | yes, a few times | Unless `reportType` is unknown, which always 500s |
| `TimeoutError`                          | yes    | Or raise `timeout`                             |
| `TypeError: fetch failed`               | yes    | Network blip                                   |
| `ResourceNotFoundException` (404)       | no     | The id or date is wrong                        |
| `BadRequestException` (400)             | no     | The query is wrong                             |
| `RangeError`                            | no     | The input is invalid                           |

## Pace bulk loops

For loops over all teams, a fixed pause between requests prevents most 429s.
`client.helpers` methods already do this through `apiSleepRate`:

```ts
for (const team of await client.teams.teams()) {
  const roster = await withRetry(() =>
    client.teams.teamRoster({ teamAbbr: team.abbr, season: 20232024 }),
  );
  // ...
  await delay(500);
}
```

Don't fire 32 requests with `Promise.all`. Keep concurrency low (2 to 4) if you
need parallelism.

Runnable version: [`examples/error-handling.mts`](../../examples/error-handling.mts).
