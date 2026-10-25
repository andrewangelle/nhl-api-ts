# Regenerate fixtures and OpenAPI

Two generators keep the SDK honest about its types. Neither touches the
network.

## Typed test fixtures

```bash
pnpm api-types:fixtures
pnpm lint:fix
pnpm typecheck:test
```

For each sample group, `fixtures` picks the largest successful sample from
`.api-types/raw/`, trims it and writes it to
`packages/nhl-api-ts/test/fixtures/<module>.mts`, typed with the response
interface:

```ts
export const rosterFixture: Roster = { forwards: [ /* ... */ ] };
```

Trimming keeps one item per array (one per `typeDescKey` for play-by-play),
and two entries of maps keyed by IDs or dates. If the type doesn't accept the
real data, `pnpm typecheck:test` fails. That's the point: it checks the
types against real responses without a network call in CI.

Things to know:

- The generator writes JSON on one line. Run `pnpm lint:fix` to format it the
  way it's committed.
- It rewrites every fixture file. Fixture changes for endpoints you didn't
  touch mean your cache is newer than the one used for the last commit. That's
  fine to commit if the types still pass. Otherwise, refetch only what you
  need on a clean cache.
- The type name comes from the spec's `name`. If the SDK exports the type
  under another name, `typecheck:test` fails with "has no exported member".
  Fix the spec or the export.
- Fixture names are `<type>Fixture`, numbered when two groups share a type
  (`statsTeamFixture2`).

## OpenAPI response schemas

```bash
pnpm openapi:schemas
```

This parses the interfaces in `packages/nhl-api-ts/src/types/` and rewrites
two blocks in `packages/nhl-api-ts/openapi.yaml`:

```yaml
    # BEGIN GENERATED SCHEMAS (pnpm openapi:schemas)
    ...
    # END GENERATED SCHEMAS (pnpm openapi:schemas)
```

and the same for `RESPONSES`. Everything outside the markers, including every
path, is written by hand.

To give a new endpoint a named response:

1. Add it to `RESPONSES` in `src/openapi.mts`:

   ```ts
   Roster: { description: 'Team roster.', schema: ref('Roster') },
   ```

   Use `wrapped('data', 'Country')` for envelopes and an inline schema for
   primitives.
2. Reference it from the path in `openapi.yaml`:

   ```yaml
         responses:
           '200': { $ref: '#/components/responses/Roster' }
   ```
3. `pnpm openapi:schemas`.

Interfaces that aren't payloads (registries, SDK-built shapes) are listed in
`SKIPPED` in `src/openapi.mts`.

`pnpm test` includes `test/openapi.test.mts`, which fails with
`openapi.yaml is stale` when the generated blocks don't match `src/types/`.
Run `pnpm openapi:schemas` after every change in `src/types/`.
