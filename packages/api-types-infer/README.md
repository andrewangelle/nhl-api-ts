# api-types-infer

Private tooling (never published) that keeps the response types of
[`nhl-api-ts`](../nhl-api-ts) honest. The NHL API is undocumented, so the
types in `packages/nhl-api-ts/src/types/` are derived from real responses
instead of guessed.

It does four things:

- **Infers** draft TypeScript interfaces from a cache of live responses.
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
4. **Check** (`src/check.mts`). Refetches everything into `.api-types/check/`,
   re-infers the snapshots and diffs them against `shapes/`. Prints added (`+`),
   removed (`-`) and changed (`~`, e.g. required -> optional) paths and exits 1
   if anything changed.
5. **Fixtures** (`src/fixtures.mts`). Trims cached responses to one item per
   array (one per variant for tagged unions) and writes them to
   `packages/nhl-api-ts/test/fixtures/<module>.mts`, each declared with its
   response type.
6. **OpenAPI** (`src/openapi.mts`). Parses the interfaces in
   `packages/nhl-api-ts/src/types/` and rewrites only the blocks between
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
pnpm api-types:fixtures   # regenerate the SDK's test/fixtures
pnpm api-types:check      # refetch and diff against shapes/ (network)
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

Run `pnpm api-types:check`. If it reports drift, update `src/types/` to match,
then run `pnpm api-types:infer` (to refresh `shapes/`), `pnpm api-types:fixtures`
and `pnpm openapi:schemas`.

## Files

| Path | Committed | Contents |
| --- | --- | --- |
| `src/` | yes | The scripts above. |
| `shapes/` | yes | Shape snapshots, the drift baseline. |
| `test/` | yes | `openapi.yaml` staleness test (`pnpm test`). |
| `.api-types/` | no | Raw responses, reports, drafts and check runs. Safe to delete. |
