# Examples

Small runnable scripts. Each one is typechecked in CI against the current
source (`pnpm typecheck:examples`). The examples call the **live** NHL API.

Run one from the repo root:

```bash
pnpm build                                  # examples import 'nhl-api-ts', which resolves to dist/
node packages/nhl-api-ts/examples/quick-start.mts
node packages/nhl-api-ts/examples/query-builder.mts
```

| Script                 | Shows                                                    |
| ---------------------- | -------------------------------------------------------- |
| `quick-start.mts`      | Client setup, teams, standings, a roster                 |
| `todays-games.mts`     | Daily schedule and scores                                |
| `game-summary.mts`     | Boxscore and play-by-play for one game                   |
| `query-builder.mts`    | Filtered skater stats with `buildQuery`                  |
| `paginate-stats.mts`   | Paging through a stats report with `start` / `limit`     |
| `edge-tracking.mts`    | NHL EDGE skater tracking data                            |
| `error-handling.mts`   | Typed exceptions and a retry wrapper                     |
