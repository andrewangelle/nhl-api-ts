# Manual Workflow

The repeatable loop is: run check to see whether anything drifted, refresh the cache only if it did, fix the types, then rebuild everything generated from the types and the cache.
 
## How the pieces relate
 
| Thing | Where it lives | Written by | Read by |
|---|---|---|---|
| Main cache | `packages/api-types-infer/.api-types/raw/` (gitignored) | `fetch` | `infer`, `conform`, `fixtures` |
| Check cache | `.api-types/check/raw/` (wiped on every full run, kept by `--replay`) | `check` | `check` only |
| Baseline snapshot | `packages/api-types-infer/shapes/` (committed) | `infer` | `check` (the `+` `-` `~` lines) |
| SDK types | `packages/nhl-api-ts/src/types/` | you, or `conform --fix --write` | `conform`, `openapi`, `fixtures` typecheck |
 
### Two things to know
 
- **`check` never updates your main cache.** It refetches into its own folder and throws that away on the next run. Every other tool still sees the old data.
- **`fetch` without `--refresh` only fills in missing samples.** It skips any file that already exists (the `existsSync` check in `runFetch`, `src/fetch.mts`), so running it again won't pick up new fields.
## The loop
 
### 1. Find drift (no changes made)
 
```sh
pnpm api-types:check
```
 
Add `--terse` for one `+N -N ~N` line per shape. To read the result again (or in the other format) without refetching, use `pnpm api-types:check --replay [--terse]`.

- **No `+` `-` `~` lines and exit 0:** you're done.
- **Shapes listed as skipped:** they were rate-limited or hit a server error and weren't diffed. Rerun later, or refetch just those endpoints in step 2.
- **Exit 1:** the SDK types reject something the API sent. This is a real type bug.
- **Exit 0 with `+` `-` `~` lines:** the types are fine, but the baseline is out of date (your `commonName.fr` case).
### 2. Refresh the cache
 
Do this only when step 1 showed differences.
 
```sh
pnpm api-types:fetch --refresh                # everything
pnpm api-types:fetch --refresh --only edge.   # or just the endpoints that drifted
```
 
This copies the new responses into the cache that the other tools read.
 
### 3. Fix the types
 
```sh
pnpm api-types:conform                 # list mismatches
pnpm api-types:conform --fix           # dry run: show the diffs
pnpm api-types:conform --fix --write   # apply the mechanical fixes
```
 
Fix anything left over by hand in `src/types/`. Rerun `pnpm api-types:conform` until it exits 0.
 
### 4. Regenerate everything built from the cache and types
 
```sh
pnpm api-types:infer      # updates shapes/ (the new baseline)
pnpm api-types:fixtures   # updates test/fixtures/ from the cache
pnpm openapi:schemas      # updates openapi.yaml schemas from the types
```
 
### 5. Verify
 
Run the full gate from `AGENTS.md`. The fixture and type checks are the ones most likely to break here.
 
```sh
pnpm lint:check && pnpm typecheck && pnpm typecheck:test && pnpm typecheck:examples \
  && pnpm typecheck:types && pnpm typecheck:scripts && pnpm test
pnpm api:report && pnpm docs:llms
```
 
### 6. Confirm and commit
 
Run `pnpm api-types:check --replay` first to confirm against the same responses, then a full `pnpm api-types:check`. It should print no drift.
 
Commit these together:
 
- `shapes/`
- `src/types/`
- `test/fixtures/`
- `openapi.yaml`
- `api-report.md`
- `llms-full.txt`
If a public type changed, add a changeset.
 
## When to refresh the cache
 
- **Every time you accept drift.** Steps 2 to 4 always go together. If you skip step 2, `infer` rebuilds `shapes/` from the old data and the `+` lines come back.
- **Before each release**, as `CONTRIBUTING.md` asks: run step 1, then steps 2–4 if it found anything.
- **Not in CI, and not just to stay current.** If nothing drifted, there's nothing to gain from a refresh.
> **Be careful with the season.** `--refresh` replaces your samples with whatever the API returns at that moment. If you refresh in the offseason, fields that only appear in-season (playoffs, live games) can show up as `-` removed or `~` required → optional. When that happens, check before you make a type optional — keeping the older type is often the right call. Refresh with `--only` to avoid touching unrelated endpoints.
 