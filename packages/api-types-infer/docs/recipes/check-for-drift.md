# Check for API drift

The NHL changes payloads without notice. `api-types:check` refetches the whole
sample matrix, compares it with the committed snapshots in `shapes/`, and then
checks it against the SDK types with conform. Run it before each release. It
is never run in CI.

```bash
pnpm api-types:check            # every drifted path
pnpm api-types:check --terse    # one +N -N ~N line per shape
pnpm api-types:check --replay   # report on the last run again, no network
```

It deletes and rewrites `.api-types/check/`, so it doesn't touch your normal
cache in `.api-types/raw/`. A full run makes about 500 requests with a 500 ms
gap, so expect it to take five minutes or more. A `429` is retried up to three
times per sample, waiting for `Retry-After` when the API sends it (5 s, 10 s,
20 s otherwise, capped at a minute), so a rate-limited run takes longer.

## Read the output

The output has two parts.

1. **The shape diff**, for information. It shows what changed in the
   payloads since `shapes/` was committed, whether or not the types already
   allow it. No change prints `api-types:check: no shape drift`. Shapes that
   couldn't be fetched are listed after it as skipped (see
   [Skipped shapes](#skipped-shapes)).
2. **The conform findings**: what the SDK types don't allow. These decide
   the exit code: 1 if there's any error, 0 otherwise. See
   [Check the types against the samples](check-types-against-samples.md)
   for the findings and tiers. Conform writes its drafts to
   `.api-types/check/draft/`, beside the refetched samples.

So a run can show shape differences and still exit 0: localized-key churn,
`integer` vs `float`, an optional field that comes and goes or a new
`OpenUnion` value need no type change.

Each shape difference is a line on stdout. For example (illustrative):

```
+ gameCenter.boxscore .playerByGameStats.awayTeam.forwards[].giveaways  integer
- teams.teamRoster .goalies[].birthStateProvince  object?
~ standings.leagueStandings .standings[].clinchIndicator  string -> string? (required -> optional)
~ gameCenter.matchUp .venueTimezone  string -> null|string (kinds changed)
+ edge.skaterSpeedTop10  (new endpoint shape)
- misc.location  (shape no longer produced)
```

| Prefix | Meaning | Usual fix |
| --- | --- | --- |
| `+` path | A field the snapshot doesn't have. | Add it to the interface, optional unless every sample has it. |
| `-` path | A field no longer sent. | Make it optional. Remove it only if it's clearly gone for good. |
| `~` required -> optional | Some samples now lack it. | Add `?`. |
| `~` optional -> required | Every sample now has it. | Usually leave it optional; older data may still lack it. |
| `~` kinds changed | The value type changed, often `null` appearing. | Add `\| null` or widen the type. |
| `+` endpoint | A sample group with no snapshot yet. | Run `infer` and commit the new snapshot. |
| `-` endpoint | No samples produced this group. | A removed sample or `groupBy` value. Delete the stale file in `shapes/`. |

The value after the path is the snapshot entry: the kinds seen, joined with
`|`, with a trailing `?` when the field is missing from some parents. See
[Read reports and drafts](read-reports-and-drafts.md#shape-snapshots).

With `--terse`, each drifted shape is one line counting its `+`, `-` and `~`
lines, and the new and removed endpoint lines stay as they are:

```
  edge.byTheNumbers  +2
  gameCenter.matchUp  +1 -71 ~2
  schedule.weeklySchedule  +1 -11 ~2
```

Use it to see where the drift is, then run without `--terse` (or
`--replay` without `--terse`, see below) for the paths.

## Skipped shapes

A shape with any sample that came back `429` or `5xx` after the retries is not
diffed: its missing fields would read as `-` removed and whole endpoints as
`$ object -> (kinds changed)`. It's listed instead, after the shape diff:

```
skipped (rate-limited or server error; not diffed, rerun later):
  stats.clubStats  5/5 samples failed
  schedule.teamSeasonSchedule  6/7 samples failed
```

`--terse` groups the list by module (`  stats  40 shape(s)`). A `404` is a real
response, not a failure, so a sample that is expected to 404 (a team that
missed the playoffs) doesn't skip its shape. Conform still runs on the
samples that did come back. Rerun `check` later, or refetch the skipped
endpoints into the main cache with `pnpm api-types:fetch --refresh --only
<module>.<method>`.

## Replay the last run

`--replay` skips the refetch and runs the shape diff and conform again on the
responses the last full run left in `.api-types/check/raw/`. It takes a couple
of seconds and makes no requests:

```bash
pnpm api-types:check --replay --terse
```

It compares those responses with the current `shapes/` and SDK types, so after
you fix a type or rerun `infer` it shows what's still outstanding, and its
output can differ from the original run's. The exit code is still conform's.
The saved responses last until the next full `check`, which deletes them. With
no previous run, it exits 1. This is unrelated to the
[history replay](check-types-against-samples.md#history-replay) in
`src/replay.mts`.

## Rule out noise first

Not every difference is drift:

- **Time-dependent samples.** `now` dates, the current season, `live` and
  `future` games change from day to day. A field that only appears during a
  live game shows up as `+` during game hours and `-` otherwise.
- **Failed requests.** Rate limits and server errors skip the shape (see
  [Skipped shapes](#skipped-shapes)). Any other `4xx` or a timeout still drops
  the sample, which can turn required fields optional or make a whole shape
  disappear. Look at the status lines `check` prints to stderr.
- **Offseason.** Several endpoints return thinner payloads between seasons.

If a difference looks like noise, rerun later before changing a type.

## Apply the drift

Conform's `--fix` reads `.api-types/raw/`, not `.api-types/check/raw/`, so
refresh the main cache first:

```bash
pnpm api-types:fetch --refresh     # or --refresh --only <module>.<method>
pnpm api-types:conform --fix       # review the diffs
pnpm api-types:conform --fix --write
```

Then:

1. Run the regeneration commands `--write` prints (`openapi:schemas`,
   `api-types:fixtures`, `typecheck:test`, `typecheck:types`, `api:report`,
   `docs:llms`).
2. Apply the propose diffs you agree with and work through the report lines,
   using the drafts in `.api-types/draft/` and the reports in
   `.api-types/report/` (`pnpm api-types:infer`).
3. `pnpm api-types:conform` until it exits 0, then `pnpm api-types:infer` to
   refresh `shapes/`.
4. `pnpm lint:fix`, `pnpm test`.
5. `pnpm api-types:check --replay` to see what's left against the same
   responses, then a full `pnpm api-types:check`. It should exit 0.
6. Commit the types, `shapes/`, fixtures and `openapi.yaml`, and add a
   changeset for the type change.
