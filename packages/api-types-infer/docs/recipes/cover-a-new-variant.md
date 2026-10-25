# Cover a new variant

Inference only knows what it has seen. A field that appears in every sample is
marked required, a field that never appeared doesn't exist, and an
`OpenUnion<...>` lists only observed values. When a type is wrong for some
games, seasons or players, the fix is usually a sample that covers them.

## Signs you're missing a variant

- A user reports a field the type doesn't have, or one marked required that
  is missing.
- The report shows a field as `required` with a count of `1` or `2`.
- An `OpenUnion` has a single value (`OpenUnion<'D'>`) where you know more
  exist.
- A union member that should exist (a play type, a report type) isn't in the
  draft.

## Add a fixed variant

Add another `add(...)` call with a distinguishing tag:

```ts
for (const [kind, params] of [
  ['now', {}],
  ['modern', { date: '2023-12-01' }],
  ['legacy', { date: '1918-02-01' }],
] as const) {
  add('standings.leagueStandings', { variant: kind }, (client) =>
    client.standings.leagueStandings(params),
  );
}
```

Variants worth covering, from experience:

| Axis | Examples |
| --- | --- |
| Game type | preseason (`1`), regular (`2`), playoffs (`3`), all-star |
| Game outcome | regulation, OT, shootout |
| Game state | future (`FUT`), live (`LIVE`/`CRIT`), final, legacy (pre-2005) |
| Calendar | in-season, offseason, all-star break, playoff dates |
| Player | skater vs. goalie, active vs. retired, rookie |
| Team | relocated or new (`UTA`, `SEA`, `ARI`), a team from 1999-2000 |
| Stats | each `reportType` / `statsType` / `attribute` |

## Add a variant discovered at run time

Some IDs can't be hard-coded: the next scheduled game, a game that's live right
now, an OT game in a given season. `discoverGames()` finds those before the
samples are built and returns them by name:

```ts
const shootout = find(
  season.games,
  (game) => game.gameOutcome?.lastPeriodType === 'SO',
);
if (shootout) {
  found.shootout = shootout;
}
```

Every game-center endpoint then gets one sample per discovered game, tagged
`{ game: 'shootout' }`. Add a new key to `found` and it's picked up by the
loops that iterate `Object.entries(games)`. Guard for absence: a `live` game
only exists while one is being played, so a fetch outside game hours has no
`game-live` samples.

`discoverReplayEvents()` does the same for event IDs inside a game. Follow
that pattern for other nested IDs.

## Refetch

New samples have new file names, so a plain fetch picks them up without
`--refresh`:

```bash
pnpm api-types:fetch --only standings.
pnpm api-types:infer
```

Then compare the report against `src/types/` and update the type. Commit the
sample change along with `shapes/`, since the snapshot now reflects the extra
variant.
