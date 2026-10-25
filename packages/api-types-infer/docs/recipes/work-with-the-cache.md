# Work with the cache

`pnpm api-types:fetch` stores every raw response under `.api-types/raw/`. Every
other command reads that cache. It's gitignored and safe to delete.

```
.api-types/raw/<module>.<method>/<tags>.json
```

Each file holds the sample's tags, the final URL, the HTTP status and the
parsed body:

```json
{ "tags": { "team": "BUF", "season": "20232024" }, "url": "https://api-web.nhle.com/v1/roster/BUF/20232024", "status": 200, "body": { } }
```

## Fetch only what you need

```bash
pnpm api-types:fetch --only edge.                  # one module
pnpm api-types:fetch --only stats.playerGameLog    # one endpoint
```

`--only` matches the start of the endpoint name. Discovery still runs first
(a few schedule, score, config and play-by-play calls), because samples can
depend on discovered IDs.

## Refetch

Samples already in the cache are skipped. Pass `--refresh` to fetch them
again:

```bash
pnpm api-types:fetch --refresh --only gameCenter.
```

Refetch when you want today's payloads, after the API has changed, or when a
cached sample failed. To start over, delete the folder:

```bash
rm -rf packages/api-types-infer/.api-types
```

## Failed samples

The status column in `fetch` output shows failures:

```
  200 teams.teamRoster team-BUF_season-20232024
  404 gameCenter.gameStory game-future
  ! schedule.playoffBracket {"year":"2015"}: Request timed out
```

- A non-200 response is cached and counted in `failed`, but inference ignores
  it. Some are expected (a game story for a future game). Remove the sample if
  it never succeeds.
- Because failures are cached, a plain `fetch` won't retry them. Use
  `--refresh --only <endpoint>`.
- A network error or timeout (`!`) writes nothing, so the next plain fetch
  retries it.
- If every sample of a group fails, `infer` writes an empty shape for it and
  `check` reports every one of its paths as removed (`-`). Check the status
  lines before treating that as drift.

## Stale samples

Samples tagged `now`, `current` or with a discovered `live` / `future` game
reflect the day they were fetched. A cache that's weeks old can disagree with
`api-types:check`. Refresh those endpoints before you trust a report.

## Write somewhere else

```bash
pnpm api-types:fetch --out /tmp/nhl-raw
```

The path is relative to `packages/api-types-infer/`. `infer` and `fixtures`
always read `.api-types/raw/`, so `--out` is only useful for inspecting
responses by hand.
