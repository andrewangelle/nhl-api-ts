# Errors

Everything `nhl-api-ts` can throw, why it happens, and what to do about it.

| Thrown                         | `errorCode`           | When                                       |
| ------------------------------ | --------------------- | ------------------------------------------ |
| `BadRequestException`          | `BAD_REQUEST`         | HTTP 400 (bad `cayenneExp` or `sortExpr`)   |
| `UnauthorizedException`        | `UNAUTHORIZED`        | HTTP 401                                   |
| `ResourceNotFoundException`    | `RESOURCE_NOT_FOUND`  | HTTP 404                                   |
| `RateLimitExceededException`   | `RATE_LIMIT_EXCEEDED` | HTTP 429                                   |
| `ServerErrorException`         | `SERVER_ERROR`        | HTTP 500-599                               |
| `NHLApiException`              | `undefined`           | Any other non-2xx status, including 3xx    |
| `RangeError`                   | n/a                   | Invalid date or unknown season (client-side) |
| `DOMException` `TimeoutError`  | n/a                   | Request exceeded `timeout`                 |
| `TypeError` (`fetch failed`)   | n/a                   | DNS, TLS or connection failure             |
| `SyntaxError`                  | n/a                   | 2xx response body is not JSON              |

## The `NHLApiException` hierarchy

```ts
class NHLApiException extends Error {
  readonly statusCode: number;           // HTTP status
  readonly errorCode?: NHLApiErrorCode;  // see table above
  name: string;                          // subclass name, e.g. "ResourceNotFoundException"
}
```

All HTTP errors extend `NHLApiException`. Catch the base class to handle every
API failure, or a subclass to handle one case:

```ts
import {
  NHLApiException,
  NHLClient,
  RateLimitExceededException,
  ResourceNotFoundException,
} from 'nhl-api-ts';

const client = new NHLClient();

try {
  await client.gameCenter.boxscore({ gameId: 2023020280 });
} catch (err) {
  if (err instanceof ResourceNotFoundException) {
    // bad id, or the game has no data yet
  } else if (err instanceof RateLimitExceededException) {
    // back off and retry
  } else if (err instanceof NHLApiException) {
    console.error(err.statusCode, err.errorCode, err.message);
  } else {
    throw err; // timeout, network, bug
  }
}
```

You can also switch on the code: `err.errorCode === NHLApiErrorCode.RATE_LIMIT_EXCEEDED`.

**Message format:** `Request to <resource> failed`, plus `: <detail>` when the
error body is JSON with a `message` field. `<resource>` is the path relative
to the base URL (for example `gamecenter/1/boxscore`), not the full URL.
Turn on `debug: true` to log full URLs.

### `BadRequestException` (400)

**Cause:** the stats API rejected a query parameter, usually a malformed
`cayenneExp` (from `defaultCayenneExp` or a custom filter) or an unknown
property in `sortExpr`. The API's parser message is appended to the
exception message, e.g.
`Request to en/skater/summary failed: Encountered unexpected token: "=" ...`.

**Fix:** read the appended message, then fix the expression or the sort
property. Property names match the field names in the report's `data` rows.

### `UnauthorizedException` (401)

**Cause:** not expected. The NHL API is public. It can show up if a proxy or
firewall between you and the API requires auth.

**Fix:** check your network path. The SDK has no credentials to configure.

### `ResourceNotFoundException` (404)

**Cause:** the resource does not exist. Typical reasons:

- a wrong game id (it must be `YYYYTTNNNN`, e.g. `2023020280`),
- a wrong player id,
- a team id passed where an abbreviation is expected, or the reverse
  (EDGE team endpoints take `teamId`, everything else takes `teamAbbr`),
- a season or game type with no data, such as playoff data (`gameType: 3`)
  for a team that missed the playoffs.

**Fix:** check the id format in [concepts.md](concepts.md#identifier-formats).
Look up valid ids with `teams.teams()`, `teams.teamRoster()` or
`schedule.teamSeasonSchedule()`.

### `RateLimitExceededException` (429)

**Cause:** too many requests in a short window. This happens most often with
`client.helpers` or with your own loops over teams or players.

**Fix:** slow down. Raise `apiSleepRate` on helpers
(`allPlayersSummaryStatistics({ season, apiSleepRate: 2 })`). In your own
loops, add a delay and retry with backoff. See
[recipes/retries.md](recipes/retries.md). The SDK never retries on its own.

### `ServerErrorException` (5xx)

**Cause:** the NHL service failed. Two common reasons:

- An unknown report type in `skaterStatsWithQueryContext({ reportType })` or
  `goalieStatsSummary({ statsType })`. The stats API answers `500`, not `404`,
  for `/en/skater/<unknown>`. This is not transient.
- A transient outage.

**Fix:** check the report type against `SKATER_REPORT_TYPES` or the goalie
types listed on `GoalieStatsSummaryParams.statsType`. If the type is valid,
retry with backoff.

### `NHLApiException` (3xx)

**Cause:** you created the client with `followRedirects: false` and called an
endpoint that uses `now` (any call that omits `date` or `season`). The API
answers `307`, which the client does not follow, so it throws
`NHLApiException` with `statusCode: 307` and the message
`Unexpected error: Request to standings/now failed`.

**Fix:** leave `followRedirects` on (the default), or pass an explicit
`date`/`season`.

### `NHLApiException` (other statuses)

**Cause:** any status not covered above (403, 410, ...). The message starts
with `Unexpected error:`.

**Fix:** check `statusCode`. A 403 often comes from a proxy or network block, not from the NHL API itself.

## `RangeError` (invalid input)

Thrown before any request, or after a lookup request, when the input can't be
valid.

| Message                                         | Thrown by                     | Fix                                           |
| ----------------------------------------------- | ----------------------------- | --------------------------------------------- |
| `Invalid date format. Please use YYYY-MM-DD.`   | `schedule.dailySchedule`, `normalizeDate` | Pass a real calendar date, e.g. `2024-10-09`. `2024-02-30` is rejected. |
| `Invalid Season Id <season>`                    | `standings.leagueStandings({ season })` | The season is not in `standings.seasonStandingManifest()`. Use `YYYYYYYY`, e.g. `20222023`. |

Other date parameters (`weeklySchedule`, `dailyScores`, `calendarSchedule`, ...)
are **not** validated. A bad value reaches the API and usually comes back as a
404.

## Timeouts: `DOMException` named `TimeoutError`

**Cause:** the request took longer than `timeout` seconds (default 10). The
SDK uses `AbortSignal.timeout`.

```ts
catch (err) {
  if (err instanceof DOMException && err.name === 'TimeoutError') { ... }
}
```

**Fix:** raise the timeout (`new NHLClient({ timeout: 30 })`). Large stats
reports and play-by-play payloads can be slow.

## Network failures: `TypeError: fetch failed`

**Cause:** DNS failure, refused connection, TLS error or offline. The
underlying error is in `err.cause`.

**Fix:** check connectivity. These errors are safe to retry.

## Query builder validation

`QueryBuilder.build()` does **not** throw for invalid filters. It skips them
and collects their messages in `context.errors`:

```ts
const context = new QueryBuilder().build([new DecisionQuery('X')]);
context.isValid(); // false
context.errors;    // ['Decision value must be one of [W, L, O]']
```

Always check `context.isValid()` before you call
`skaterStatsWithQueryContext`. A skipped filter silently widens the query.

`InvalidQueryValueException` is the error that filters throw internally
during validation. The builder catches it, so it never reaches your code from
`build()`. It is exported so that custom `QueryBase` subclasses can throw it
from `validate()`.

## CLI exit codes

| Exit | Meaning                                                        | stderr starts with |
| ---- | -------------------------------------------------------------- | ------------------ |
| `0`  | Success. JSON on stdout                                        |                    |
| `1`  | API error (`error: <message> (HTTP <status>)`), timeout or network failure | `error:`           |
| `2`  | Usage error: unknown module or command, missing or invalid argument, invalid date, invalid filters | `error:` then help text |
