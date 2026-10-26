# api-types-infer

Private, unpublished tooling for maintaining the response types of
[`nhl-api-ts`](../nhl-api-ts). The NHL API is undocumented, so the
types in `packages/nhl-api-ts/src/types/` are derived from probing the live api.

It does five things:

- **Infers** draft TypeScript interfaces from a cache of live responses.
- **Checks the SDK types against the responses** (conform) and fixes the
  mechanical mismatches with a codemod.
- **Detects drift** between today's API and the committed shape snapshots.
- **Writes typed fixtures** for the SDK tests, so `tsc` catches a type that
  no longer matches real data.
- **Generates the response schemas** in the SDK's `openapi.yaml` from
  `src/types/`.

Only `fetch` and `check` touch the network. Nothing here runs against the live
API in CI.

## How it works

```
samples.mts ──fetch──▶ .api-types/raw/ ──infer──▶ .api-types/report/  (path tables)
 (SDK calls)                 │                     .api-types/draft/   (draft interfaces)
                             │                     shapes/             (committed baseline)
                             ├──conform──▶ findings vs nhl-api-ts/src/types/ (--fix edits them)
                             └──fixtures──▶ nhl-api-ts/test/fixtures/

nhl-api-ts/src/types/ ──openapi──▶ nhl-api-ts/openapi.yaml (generated blocks)
```

1. **Sample matrix** (`src/samples.mts`). A declarative list of SDK calls that
   covers the variants worth seeing: regular season vs. playoffs, OT and
   shootout games, future and legacy games, skaters vs. goalies, each stats
   report type, and so on. Some game IDs are discovered at run time. Every
   sample goes through the real SDK, so a fetch also exercises each URL.
2. **Fetch** (`src/fetch.mts`). Runs the matrix with a 250 ms delay between
   calls and caches each raw response at
   `.api-types/raw/<module>.<method>/<tags>.json`. Cached samples are skipped
   unless you pass `--refresh`.
3. **Infer** (`src/infer.mts`, `shape.mts`, `emit.mts`). Merges all samples of
   an endpoint into one shape tree that records, for every path, the kinds seen,
   how often it appeared and which samples lacked it. From that it writes:
   - `.api-types/report/<endpoint>.md`: a table of every path with its status
     (required / optional / nullable), kinds and observed values.
   - `.api-types/draft/<endpoint>.mts`: draft interfaces that follow the type
     rules in [AGENTS.md](../../AGENTS.md) (optional only if missing somewhere,
     nullable only if `null` was seen, `OpenUnion` for enum-like strings,
     discriminated unions, dynamic-key maps).
   - `shapes/<endpoint>.json`: a flat `path -> kind` snapshot. This is
     committed and is the baseline for drift checks.
4. **Conform** (`src/conform.mts`, `conformance.mts`, `declarations.mts`,
   `codemod.mts`). Reads the declared type of every sample group through the
   TypeScript checker (ts-morph) and walks the observed shape alongside it.
   Reports only what the types don't already allow (a field they don't
   declare, an unexpected `null`, a required field some responses lack, ...),
   exits 1 on errors, and sorts each finding into a tier: `auto` fixes it can
   write, `propose` diffs for review and `report` lines for design decisions.
   Also rewrites the drafts beside the raw dir it read.
5. **Check** (`src/check.mts`). Refetches everything into `.api-types/check/`,
   re-infers the snapshots and diffs them against `shapes/` for information
   (added `+`, removed `-` and changed `~` paths), then runs conform on the
   refetch and exits 1 on its errors.
6. **Fixtures** (`src/fixtures.mts`). Trims cached responses to one item per
   array (one per variant for tagged unions) and writes them to
   `packages/nhl-api-ts/test/fixtures/<module>.mts`, each declared with its
   response type.
7. **OpenAPI** (`src/openapi.mts`). Reads the interfaces in
   `packages/nhl-api-ts/src/types/` with the same ts-morph loader as conform
   and rewrites only the blocks between
   `BEGIN GENERATED` / `END GENERATED` in `openapi.yaml`. The test in
   `test/openapi.test.mts` fails if that file is stale.

### Endpoint specs

`src/specs.mts` tells inference how the SDK returns each endpoint:

- `unwrap`: the property the SDK returns instead of the body (`data`, `games`,
  ...).
- `groupBy`: a sample tag that splits one endpoint into several types (e.g.
  `reportType` for skater stats reports).
- `name`: the root interface name in the draft.
- `ALIASES`: endpoints that share a URL and payload with another endpoint, so
  their samples feed that endpoint's type.

Endpoints not listed return the body as-is and are named after the method.

## Usage

Run from the repository root:

```bash
pnpm api-types:fetch      # cache live responses (network)
pnpm api-types:infer      # write reports, drafts and shapes/
pnpm api-types:conform    # check src/types against the cached samples; --fix [--write]
pnpm api-types:fixtures   # regenerate the SDK's test/fixtures
pnpm api-types:check      # refetch, diff against shapes/ and conform (network)
pnpm openapi:schemas      # regenerate openapi.yaml response schemas
```

`fetch` flags, e.g. `pnpm api-types:fetch --refresh --only edge.`:

| Flag | Effect |
| --- | --- |
| `--refresh` | Refetch samples that are already cached. |
| `--only <prefix>` | Only run samples whose endpoint starts with the prefix, e.g. `edge.` or `stats.playerGameLog`. |
| `--out <dir>` | Write raw responses somewhere other than `.api-types/raw`. |

### Adding or changing a response type

1. Add samples for the endpoint to `src/samples.mts`. Cover each variant that
   could change the payload. Add an entry to `src/specs.mts` if the SDK unwraps
   the response or it needs a specific name.
2. `pnpm api-types:fetch --only <module>.<method>` then `pnpm api-types:infer`.
3. Read `.api-types/report/<endpoint>.md` and copy what you need from
   `.api-types/draft/<endpoint>.mts` into
   `packages/nhl-api-ts/src/types/<module>.mts`. The draft is a starting
   point: rename interfaces, reuse existing ones and add JSDoc.
4. `pnpm api-types:fixtures`, then `pnpm typecheck:test` and
   `pnpm typecheck:types`.
5. `pnpm openapi:schemas`.
6. Commit the type changes, `shapes/`, the fixtures and `openapi.yaml`.

### Before a release

Run `pnpm api-types:check`. If conform reports errors, run
`pnpm api-types:fetch --refresh` (`conform` and `infer` read
`.api-types/raw/`, not the check cache), then `pnpm api-types:conform --fix`
and `--fix --write`, run the regeneration commands it prints, work through
the remaining findings and finish with `pnpm api-types:infer` (to refresh
`shapes/`). See
[Check the types against the samples](docs/recipes/check-types-against-samples.md).

## Recipes

- [Add a response type for a new endpoint](docs/recipes/add-a-response-type.md)
- [Cover a new variant](docs/recipes/cover-a-new-variant.md): more samples, IDs discovered at run time
- [Check the types against the samples](docs/recipes/check-types-against-samples.md): conform findings, fix tiers, the per-probe workflow, history replay
- [Check for API drift](docs/recipes/check-for-drift.md): reading `check` output, noise vs. real drift
- [Read reports and drafts](docs/recipes/read-reports-and-drafts.md): report columns, draft output, snapshots
- [Endpoint specs](docs/recipes/endpoint-specs.md): `unwrap`, `groupBy`, `ALIASES`, `emit`
- [Regenerate fixtures and OpenAPI](docs/recipes/regenerate-fixtures-and-openapi.md)
- [Work with the cache](docs/recipes/work-with-the-cache.md): `--only`, `--refresh`, failed and stale samples

## Files

| Path | Committed | Contents |
| --- | --- | --- |
| `src/` | yes | The scripts above. |
| `shapes/` | yes | Shape snapshots, the drift baseline. |
| `test/` | yes | Conform and codemod tests, `openapi.yaml` staleness test (`pnpm test`). |
| `.api-types/` | no | Raw responses, reports, drafts and check runs. Safe to delete. |
