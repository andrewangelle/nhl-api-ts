# Plan: make the `shapes/` baseline accumulate, so drift noise goes down over time

Status: not started. Package: `packages/api-types-infer` (paths below are
relative to it unless noted).

## Problem

`pnpm api-types:check` diffs the shapes re-inferred from one run's samples
(`.api-types/check/raw`) against the committed snapshots in `shapes/`. Three
kinds of noise keep coming back even after the SDK types already allow the
payload:

1. **`+` paths the types already cover but `shapes/` lacks.** Hand-editing
   `shapes/*.json` silences them (as in 15352da), but:
   - `pnpm api-types:infer` rewrites every `shapes/<key>.json` from
     `.api-types/raw` (`src/infer.mts:146`), so hand edits vanish unless the
     main cache has the field.
   - Hand-typed values must match `snapshot()` (`src/shape.mts:215`) exactly
     (sorted kinds joined by `|`, `?` relative to the parent's count, every
     ancestor path present), or the `+` becomes a `~`.
2. **`-` lines for rare / time-dependent fields.** A field that only some
   months, live games or the season carry (`specialEvent`) is `-` on any run
   whose samples miss it. Same for the children of a missing optional object
   and the `[]` items of arrays that came back empty this run.
3. **Wrong values poison `src/replay.mts`.** `shapesAt()` feeds committed
   snapshots to conform through `shapeFromSnapshot()`.

## Goal

- `check --accept` writes the new `+` paths (computed by the tool) into
  `shapes/`, add-only.
- `infer` merges into `shapes/` instead of overwriting, so accepted paths
  survive; a `--reset` flag keeps today's full rewrite for real removals.
- The diff reports a missing path that was optional (or sits under a missing
  optional path, or is the items of an array that came back empty) as
  *unseen*, not `-`, and doesn't count it as a difference.

Non-goals: changing conform, the exit code (still conform's), or the fetch
matrix.

## Design

### 1. Snapshot merge + normalization (`src/shape.mts`)

Add next to `snapshot()`:

```ts
/**
 * Merges `next` into `base`. New paths are added; with `overwrite`, paths in
 * both take `next`'s value (infer), otherwise `base`'s (check --accept).
 * Paths only in `base` are kept. The result is in `snapshot()` order.
 */
export function mergeSnapshots(
  base: Snapshot,
  next: Snapshot,
  options: { overwrite: boolean },
): Snapshot;

/** Rewrites `snap` in `snapshot()` order (sorted props, depth-first, `[]` last). */
export function normalizeSnapshot(snap: Snapshot): Snapshot;
```

- Ordering: implement `normalizeSnapshot` as
  `snapshot(shapeFromSnapshot(snap))` if the round trip is lossless (it should
  be: `shapeFromSnapshot` sets every kind to the node's count and marks
  optional nodes one less than the parent). Verify with a test over every
  committed file in `shapes/` (round trip must equal the file). If it isn't
  lossless, write a comparator over `pathSegments()` instead.
- Watch for: a path whose parent is missing is silently dropped by
  `shapeFromSnapshot` (`if (!parent) continue`). Merging only adds complete
  ancestor chains from `next`, so this shouldn't happen, but the round-trip
  test will catch it.
- A `next` that adds a child under a `base` path whose kinds don't include
  `object`/`array` (e.g. base `.x: string`, next `.x: null|object` plus
  `.x.y`): in add-only mode `.x` keeps `string` and gets an object child.
  Decide: either take `next`'s value for any ancestor of an added path, or
  skip adding that subtree and leave it as a `~` for a human. Recommend
  **skip and leave the `~`**; it's a real type change.

### 2. `--accept` on check (`src/check.mts`)

- Parse `--accept` next to `--terse` / `--replay`. Usage string becomes
  `api-types:check [--terse] [--replay] [--accept] [--only <prefix>...]`.
- After printing the drift report and before `runConform`, for every shape in
  `shapes` (already filtered by `--only`) that isn't in `skipped`:
  - existing file: `mergeSnapshots(before, snapshot(shape), { overwrite: false })`;
    write only if it changed.
  - no file (`+ key (new endpoint shape)`): write `snapshot(shape)` as is.
  - removed shapes (`- key (shape no longer produced)`): leave alone.
- Write with the same formatting as infer:
  `${JSON.stringify(snap, null, 2)}\n`. Factor a `writeSnapshot(key, snap)`
  helper into `src/shape.mts` or `src/paths.mts` and use it from both.
- Print to stderr: `api-types:check: accepted N path(s) in M shape(s)` (plus
  `K new shape(s)` when any).
- Works with `--replay` (no network) and `--only`. Typical use:
  `pnpm api-types:check --replay --accept --only schedule`.
- `~` lines are not accepted. Open question below.
- Extract the accept step into an exported pure-ish function (for example
  `acceptDrift(shapes, shapesDir, skipped)` returning the per-key snapshots to
  write) so it's testable without the CLI.

### 3. `infer` merges by default (`src/infer.mts`)

- Replace the unconditional `writeFileSync(${SHAPES_DIR}/${group}.json, ...)`
  with: read the existing file if present,
  `mergeSnapshots(existing, snapshot(shape), { overwrite: true })`, write.
  New values win (the main cache is the trusted, reviewed data), so `~`
  changes still land the way they do today.
- `--reset`: today's behavior (write `snapshot(shape)` as is). Use it when a
  field is truly gone and you want the `-` to stop. Document it.
- Update the file header comment (`shapes/<endpoint>.json  committed shape
  snapshot (drift baseline), merged; --reset rewrites`).
- `infer` doesn't delete `shapes/` files for groups it no longer produces
  today either; keep that.

### 4. "Unseen" instead of `-` (`src/check.mts`, `diffSnapshots`)

In the `before`-only loop, classify a missing path as unseen when any of
these is true:

- its own `before` value ends in `?`;
- an ancestor path (by `pathSegments`) is also missing from `after` and is
  unseen (so the children of a missing optional object follow it);
- its last segment is `[]` and the parent path is in `after` (the array came
  back empty in every sample this run).

Otherwise it stays `-` (a required field is gone, real drift).

Output:

- Prefix unseen lines with `?`: `? schedule.teamMonthlySchedule [].specialEvent  object?`.
- Don't count them in `differences`, so "no shape drift" can still print.
- `summarize()` counts `?` too (`+2 -1 ~3 ?14`); `--terse` shows it.
- Add a `--strict` flag (or reuse a name you like) that prints unseen paths
  as `-` again, for the pre-release review. Optional; decide when
  implementing.

`pathSegments` is module-private in `src/shape.mts`; export it.

## Tests (`test/check.test.mts`, plus a new `test/shape.test.mts`)

- `mergeSnapshots`: add-only keeps base values; overwrite takes next values;
  base-only paths kept; output order equals `snapshot()` order; the
  "child under a non-object base path" case follows the decision in §1.
- `normalizeSnapshot`: round trip is identity for every file in `shapes/`.
- `diffSnapshots`:
  - missing optional path -> `?`, not `-`;
  - missing required child of a missing optional parent -> `?`;
  - missing `[]` items with the array present -> `?`;
  - missing required path with present parent -> `-`;
  - `summarize` includes `?N` and existing `'+2 -2 ~1'` assertion still holds.
- `acceptDrift`: skipped shapes untouched; new shape written whole; removed
  shapes untouched; `~` paths keep the base value.

## Docs

- `README.md` (this package): flags table (`--accept`), the `shapes/` bullet
  (line ~52: now merged, `--reset`), the check step (line ~63: `?` unseen).
- `docs/recipes/check-for-drift.md`:
  - "Read the output": add the `?` unseen line to the example and the prefix
    table ("Not in this run's samples. Usually nothing to do.").
  - New section "Accept drift into the baseline" for `--accept`.
  - "Apply the drift" step 3: `infer` now merges; mention `--reset`.
  - "Rule out noise first": note that unseen paths are already separated out.
- `docs/recipes/full-manual-workflow.md`: line ~87 ("If you skip step 2,
  `infer` rebuilds `shapes/` from the old data and the `+` lines come back")
  is no longer true for added paths; reword. Mention `--reset`.
- `docs/recipes/read-reports-and-drafts.md#shape-snapshots`: baseline is a
  union across runs, not one run's output.
- Root `AGENTS.md` and `CONTRIBUTING.md` command lists: add
  `pnpm api-types:check --replay --accept` and `pnpm api-types:infer --reset`.

## Rollout

1. Implement §1 with tests.
2. §4 (diff) with tests. Run `pnpm api-types:check --replay --terse` and
   compare the counts with the last run: `-` should drop, `?` appear.
3. §2 (`--accept`). Run `pnpm api-types:check --replay --accept`, review the
   `shapes/` git diff, commit it on its own
   (`chore(api-types-infer): Accept drift into shapes`).
4. §3 (`infer` merge). Run `pnpm api-types:infer` and confirm `shapes/` has
   no diff (or only `~` value updates from the main cache).
5. Docs.
6. Before finishing: `pnpm lint:check && pnpm typecheck && pnpm test` from the
   root (the SDK-specific typechecks aren't affected, but run the full list in
   AGENTS.md anyway).

No changeset: `api-types-infer` is private (`privatePackages.version: false`).

## Open questions

- Should `--accept` also take `~` values? Probably only `optional -> required`
  is safe to skip forever and `required -> optional` / `kinds changed` are
  worth seeing until conform/infer lands them. Start add-only.
- `--strict` (unseen shown as `-`) or always separate? Decide after seeing
  how many `?` lines a full run has.
- Should a full non-`--only` `check` (not `--replay`) without `--accept`
  print a hint like `N path(s) could be accepted with --accept`?
