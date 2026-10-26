# Check for API drift

The NHL changes payloads without notice. `api-types:check` refetches the whole
sample matrix, compares it with the committed snapshots in `shapes/`, and then
checks it against the SDK types with conform. Run it before each release. It
is never run in CI.

```bash
pnpm api-types:check
```

It deletes and rewrites `.api-types/check/`, so it doesn't touch your normal
cache in `.api-types/raw/`. A full run makes about 500 requests with a 250 ms
gap, so expect it to take a few minutes.

## Read the output

The output has two parts.

1. **The shape diff**, for information. It shows what changed in the
   payloads since `shapes/` was committed, whether or not the types already
   allow it. No change prints `api-types:check: no shape drift`.
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

## Rule out noise first

Not every difference is drift:

- **Time-dependent samples.** `now` dates, the current season, `live` and
  `future` games change from day to day. A field that only appears during a
  live game shows up as `+` during game hours and `-` otherwise.
- **Failed requests.** A `4xx`/`5xx` or a timeout drops a sample, which can
  turn required fields optional or make a whole shape disappear. Look at the
  status lines `check` prints to stderr.
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
5. `pnpm api-types:check` again. It should exit 0.
6. Commit the types, `shapes/`, fixtures and `openapi.yaml`, and add a
   changeset for the type change.
