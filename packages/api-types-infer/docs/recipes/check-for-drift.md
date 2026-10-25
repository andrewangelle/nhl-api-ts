# Check for API drift

The NHL changes payloads without notice. `api-types:check` refetches the whole
sample matrix and compares it with the committed snapshots in `shapes/`. Run it
before each release. It is never run in CI.

```bash
pnpm api-types:check
```

It deletes and rewrites `.api-types/check/`, so it doesn't touch your normal
cache in `.api-types/raw/`. A full run makes about 500 requests with a 250 ms
gap, so expect it to take a few minutes.

## Read the output

No drift prints `api-types:check: no drift` and exits 0. Otherwise each
difference is a line on stdout and the command exits 1. For example
(illustrative):

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

`infer` reads `.api-types/raw/`, not `.api-types/check/raw/`, so refresh the
main cache before you regenerate anything:

```bash
pnpm api-types:fetch --refresh     # or --refresh --only <module>.<method>
pnpm api-types:infer
```

Then:

1. Update `packages/nhl-api-ts/src/types/` using the new
   `.api-types/report/<endpoint>.md`.
2. `pnpm api-types:fixtures`, `pnpm openapi:schemas`, `pnpm lint:fix`.
3. `pnpm typecheck:test && pnpm typecheck:types && pnpm test`.
4. `pnpm api-types:check` again. It should report no drift.
5. Commit the types, `shapes/`, fixtures and `openapi.yaml`, and add a
   changeset for the type change.
