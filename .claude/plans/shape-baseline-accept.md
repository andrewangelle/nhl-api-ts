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
   whose samples miss it. Same for the children of a missing optional object,
   and for arrays that came back empty this run: `snapshot()` still writes
   `.x[]: ""` for them (`node.items ??= newNode()`), so the diff shows
   `~ .x[]  object -> ""` and a `-` for every `.x[].y` child.
3. **Wrong values poison `src/replay.mts`.** `shapesAt()` feeds committed
   snapshots to conform through `shapeFromSnapshot()`.

## Goal

- `check --accept` writes the new `+` paths (computed by the tool) into
  `shapes/`, and widens values that only gained kinds or a `?` (union
  semantics, see §1 and Decisions). It never drops a kind or a path.
- `infer` merges into `shapes/` instead of overwriting, so accepted paths
  survive; a `--reset` flag keeps today's full rewrite for real removals.
- The diff reports a missing path that was optional (or sits under a missing
  optional path, or is the items of an array that came back empty, or sits
  under one) as *unseen*, not `-` / `~`, and doesn't count it as a difference.
- The diff treats a value that is a subset of the baseline's (fewer kinds,
  or `K` against a baseline `K?`) as consistent (no line), so an accepted
  always-present field leaves no permanent `~ optional -> required` line and
  a run that missed one kind leaves no `~ float|integer -> float` line.
- Unseen subtrees print as one line (the root, with a `(+N below)` count).
- Without `--accept`, check says how much `--accept` would take.

Non-goals: changing conform, the exit code (still conform's), or the fetch
matrix.

## Design

### 1. Snapshot merge + normalization (`src/shape.mts`)

Add next to `snapshot()`:

```ts
/**
 * Merges `next` into `base`. New paths are added (marked `?` when their
 * parent exists on the other side); with `overwrite`, paths in both take
 * `next`'s value (infer), otherwise the union of both values unless `next`
 * both adds and drops kinds, which keeps `base`'s (check --accept). A
 * `base` value of `""` always yields to `next`'s.
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

- **Paths in both, add-only mode (union semantics).** Compare `next`'s kinds
  (`N`) with `base`'s (`B`), ignoring `?`:
  - `N ⊆ B`: `base` is already the union. Keep `base`'s kinds; the value is
    optional if either side is (`B?` stays, `B` with `next` `N?` gets `?`).
  - `N ⊇ B` (adds kinds): take `N`, optional if either side is.
  - neither (adds and drops kinds, e.g. `string` vs `integer`, `object` vs
    `array`): a real type change. Keep `base`'s value unchanged; `next`-only
    children that need a kind `base` lacks are skipped (rule below).
  - Never add `?` to a `[]` path (below). A union never removes a kind, so it
    can't orphan a `base` child.
  - Because a widened parent can gain `object` or `array`, the kind check for
    `next`-only children runs against the *merged* value: base `.x: object`,
    next `.x: array|object` + `.x[]: object` gives `.x: array|object` and
    `.x[]: object` (no `?`).
  - Overwrite mode (infer) is unchanged: `next` wins, subject to the orphan
    rule below.
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
- A `next` that adds a child under a `base` path:
  - **`base` value is `""`** (no information: an array that was always empty
    has an items node with no kinds, `shape.mts:155`; 5 committed files have
    these, e.g. `.summary.iceSurface.awayTeam.penaltyBox[]: ""`). In both
    modes take `next`'s value for that path and add its whole subtree (base
    `.x[]: ""`, next `.x[]: object` + `.x[].y: string` gives `.x[]: object`
    and `.x[].y: string`). This is not a type change.
  - **The parent's merged value lacks the kind the child needs** (a `.prop`
    child needs `object`, a `[]` child needs `array`; e.g. base `.x: string`,
    next `.x: null|object` plus `.x.y`, which adds and drops kinds so `.x`
    keeps `string`): skip that child's subtree and leave the `~` for a human;
    it's a real type change. Check the specific kind per child segment, not
    just "object or array".
  - A `next`-only child is marked `?` only when `base`'s value for the parent
    has the kind the child needs (`base` had objects/arrays there without the
    child). When the parent only gained that kind in the merge, the child is
    copied with its own marker.
- **Never add `?` to a path whose last segment is `[]`.** `snapshot()` always
  writes `[]` items with `optional=false` (`shape.mts:227-228`), so a `?` there
  would be dropped by the round trip.
- **Optional markers on merged paths.** `?` means "not present in every
  parent" (`shape.mts:212-214`), so a path that exists on only one side is
  optional in the union whenever its parent exists on the other side.
  - Adding a `next`-only path whose parent exists in `base`: add `?` to its
    value if not already there (except `[]` paths, see above). Do this only at the top of each added subtree
    (the path whose parent is in `base`); descendants keep their own markers,
    since `?` is relative to the parent. If the parent was taken from `next`
    (the `""` case above) the subtree is complete and nothing is added.
  - Overwrite mode: a `base`-only path kept whose parent is in `next` gets `?`
    the same way (it was absent from `next`'s parents), again never on `[]`
    paths. Kept `base`-only
    subtrees whose parent is also base-only keep their values.
  - Without this, a later run that misses the field would show `-` instead of
    unseen (§4 only treats `?` values as unseen), and `shapesAt()` would feed
    conform a required field that is really optional.
- Overwrite mode has the mirror problem. Base-only paths are kept, but `next`
  can replace their parent's value with one that lacks the kind the kept
  children need (e.g. accepted `.x[]: object` plus `.x[].y`, then an infer run
  where `.x` was empty gives `.x[]: ""`; or base `.x: object` plus `.x.y`,
  next `.x: array` plus `.x[]`). The kept `.x[].y` / `.x.y` would be orphaned:
  `snapshot()` decides a property child's `?` against the parent's object count
  (`node.kinds.object ?? 0`, `shape.mts:225`), which is 0, so the round trip
  silently drops the `?` from those children and normalization isn't lossless.
  Rule: in overwrite mode, for each kept `base`-only child of a path, check
  the kind that child's segment needs (`.prop` needs `object`, `[]` needs
  `array`) against `next`'s value for the parent. If `next`'s value lacks it
  and `base` has such descendants, keep `base`'s value for the parent path (so
  its children stay valid), and keep the whole subtree's base values. Result:
  no orphaned children in either mode. Consequence: a real type change on a
  path with descendants (`object -> string`, `object -> array`, ...) does not
  land through plain `infer`; it needs `--reset`.

### 2. `--accept` on check (`src/check.mts`)

- `--accept` takes the `+` paths and the `~` lines labelled `required ->
  optional` or `kinds added` (both come from the §1 union merge). `~ kinds
  changed` (adds and drops kinds) is never accepted.
- Parse `--accept` next to `--terse` / `--replay`. Usage string becomes
  `api-types:check [--terse] [--replay] [--accept] [--only <prefix>...]`.
- After printing the drift report and before `runConform`, for every shape in
  `shapes` (already filtered by `--only`) that isn't in `skipped`:
  - existing file: `mergeSnapshots(before, snapshot(shape), { overwrite: false })`;
    write only if it changed.
  - no file (`+ key (new endpoint shape)`): write `snapshot(shape)` as is.
  - removed shapes (`- key (shape no longer produced)`): leave alone.
- Write with the same formatting as infer:
  `${JSON.stringify(snap, null, 2)}\n`. Factor a `writeSnapshot(dir, key, snap)`
  helper (takes the target folder so tests can use a temp dir) into
  `src/shape.mts` or `src/paths.mts` and use it from both.
- Print to stderr: `api-types:check: accepted N path(s) and widened W
  value(s) in M shape(s)` (plus `K new shape(s)` when any).
- Without `--accept`, on any run (live, `--replay`, `--only`), run the same
  computation without writing and, when anything would change, add to the
  stderr summary: `N path(s) and W value(s) could be accepted with
  --accept` (plus `K new shape(s)`).
- `--accept` doesn't gate on conform errors (it runs before conform). The
  docs say to accept only drift the SDK types allow.
- Works with `--replay` (no network) and `--only`. Typical use:
  `pnpm api-types:check --replay --accept --only schedule`.
- Extract the accept step into an exported pure-ish function (for example
  `acceptDrift(shapes, shapesDir, skipped)` returning the per-key snapshots to
  write plus the path, widened-value and new-shape counts) so it's testable
  without the CLI and the hint can reuse it.

### 3. `infer` merges by default (`src/infer.mts`)

- Replace the unconditional `writeFileSync(${SHAPES_DIR}/${group}.json, ...)`
  with: read the existing file if present,
  `mergeSnapshots(existing, snapshot(shape), { overwrite: true })`, write.
  New values win (the main cache is the trusted, reviewed data), so most `~`
  changes still land the way they do today. Exception (§1 orphan rule): when
  `next`'s value for a path lacks the kind its `base` descendants need
  (`object` for `.prop`, `array` for `[]`), `base`'s value is kept, so a real
  type change such as `object -> string` or `object -> array` needs `--reset`.
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
- an ancestor path (by `pathSegments`) is unseen: either missing from `after`
  and unseen itself, or present in `after` with value `""` (no kinds, i.e. an
  empty array's items node) while its `before` value has kinds (so the
  children of a missing optional object, or of an empty array's items, follow
  it).

Also, in the changed-paths loop: a path whose last segment is `[]`, whose
`after` value is `""` and whose `before` value has kinds is unseen, not
`~ ... (kinds changed)`. The array came back empty in every sample this run:
`snapshot()` still emits `.x[]: ""` for it (`shape.mts:155`, `219-228`), so
the path is not missing and the plain "missing `[]` path" rule would never
fire. Only values not `""` in `before` qualify; `before` `""` vs `after`
`""` is no change.

Otherwise it stays `-` (a required field is gone, real drift).

Also, in the changed-paths loop (after the empty-array rule above): the
baseline is a union across runs, so an `after` value that is a subset of
`before` (its kinds ⊆ `before`'s kinds, and `after` is optional only if
`before` is) is consistent with the baseline. This covers `K?` against `K`
(the field is optional in the union and this run carried it everywhere;
`snapshot()` writes no `?` for it, `shape.mts:225`) and a run that missed a
kind (`float|integer -> float`, `integer|null -> integer`,
`float|integer? -> float?`). Without this rule every accepted always-present
field (e.g. base `.p`, next `.p.c: string`, accepted as `.p.c: string?`)
would turn into a permanent `~ ... string? -> string` line on every later run
and block "no shape drift". Drop these from the diff entirely (no line, not
counted in `differences`, not in the `?` unseen count).

The remaining `~` lines are labelled by `flipValue`:

- `required -> optional`: same kinds, `after` adds `?`. Accepted by `--accept`.
- `kinds added`: `after`'s kinds ⊋ `before`'s (with or without a new `?`).
  Accepted by `--accept`.
- `kinds changed`: `after` adds and drops kinds. Not accepted.

`optional -> required` is no longer reported.

Output:

- Prefix unseen lines with `?`: `? schedule.teamMonthlySchedule [].specialEvent  object?`.
- Print only the root of each unseen subtree (the unseen path whose parent
  isn't unseen), with a count of the unseen paths below it when there are
  any: `? gameCenter.playByPlay .summary.iceSurface  object?  (+62 below)`.
  On the last check run this is 61 lines for 192 unseen paths.
- Don't count them in `differences`, so "no shape drift" can still print.
- `summarize()` counts `?` too (`+2 -1 ~3 ?14`) as paths, not lines: an
  unseen root line counts `1 + N`. Same for `DriftReport.unseen`. Either
  parse the `(+N below)` suffix or have `diffSnapshots` return structured
  entries; pick whichever keeps `summarize` simple.
- No `--strict` flag (see Decisions).

`pathSegments` is module-private in `src/shape.mts`; export it.

## Tests (`test/check.test.mts`, plus a new `test/shape.test.mts`)

- `mergeSnapshots`: add-only keeps base values when next is a subset
  (`float|integer` + next `float` -> `float|integer`); add-only widens
  (`float` + next `float|integer` -> `float|integer`; `string` + next
  `string?` -> `string?`); add-only keeps base on adds-and-drops (`string` +
  next `integer` -> `string`); overwrite takes next values;
  base-only paths kept; output order equals `snapshot()` order; the
  "child under a non-object base path" case skips the subtree (§1);
  base `.x[]: ""` + next `.x[]: object`, `.x[].y: string` -> `.x[]: object`,
  `.x[].y: string` (both modes);
  optional markers (both modes): add-only with base parent `.p` and no
  `.p.c`, next `.p.c: string` -> `.p.c: string?`; overwrite with kept
  base-only `.p.c: string` whose parent `.p` is in next -> `.p.c: string?`;
  descendants of an added subtree keep their own markers;
  overwrite-mode orphan case: base `.x[]: object` + `.x[].y: string`, next
  `.x[]: ""` -> `.x[]` keeps `object`, `.x[].y` valid, and
  `normalizeSnapshot` of the result keeps its `?` markers;
  type-change cases, in both modes, asserting `normalizeSnapshot(result)`
  equals `result` each time:
  - `object -> array`: base `.x: object` + `.x.y: string`, next `.x: array` +
    `.x[]: object`. Add-only: `.x` keeps `object`, `.x[]` subtree skipped.
    Overwrite: `.x` keeps base's `object` and `.x.y` (no orphan).
  - `array -> object`: base `.x: array` + `.x[]: object`, next `.x: object` +
    `.x.y: string`. Add-only: `.x.y` skipped. Overwrite: `.x` keeps `array`.
  - add-only with base `.x: object`, next `.x: array|object` + `.x[]: object`:
    `.x` widens to `array|object` and `.x[]: object` is added without `?`
    (no `.x[]` value ever ends in `?`);
- `normalizeSnapshot`: round trip is identity for every file in `shapes/`
  (extend the existing round-trip test at `test/conformance.test.mts:296-308`
  rather than writing a new one).
- `diffSnapshots`:
  - missing optional path -> `?`, not `-`;
  - missing required child of a missing optional parent -> no line of its
    own: the parent's line reads `(+1 below)` and `summarize` gives `?2`;
  - empty array: build `after` with a real `snapshot()` of a shape from
    samples `{x: []}` (not hand-written data) against a `before` with
    `.x[]: object` and `.x[].y: string`: one line `? s .x[]  object  (+1
    below)` (not `~`, no `-` for `.x[].y`), not counted in `differences`;
  - subset values -> no line, not counted: `.p.c: string?` vs `string`,
    `float|integer` vs `float`, `integer|null` vs `integer`,
    `float|integer?` vs `float?`;
  - still `~` and counted: `string` vs `string?` (`required -> optional`),
    `float` vs `float|integer` (`kinds added`), `string?` vs `integer`
    (`kinds changed`);
  - missing required path with present parent -> `-`;
  - `summarize` includes `?N` and existing `'+2 -2 ~1'` assertion still holds.
- `acceptDrift`: skipped shapes untouched; new shape written whole; removed
  shapes untouched; `required -> optional` and `kinds added` values widened
  and counted as widened; `kinds changed` paths keep the base value.
- Accept then re-check, end to end at the function level (the CLI runs only
  under `import.meta.main` and hardcodes `CHECK_RAW`/`SHAPES_DIR`, so don't
  spawn it): over a fixture where the parent exists in base and the new child
  is present in every sample, `driftReport` → `acceptDrift` →
  `writeSnapshot(dir, ...)` into a `mkdtemp` folder → `driftReport` again with
  that folder as `shapesDir`. The first pass accepts `.p.c` as `string?`; the
  second reports no counted line for `.p.c` (no `+`, no `~ string? -> string`),
  and `differences` for it is 0. Same round trip for each accepted `~`, one
  change per case: (1) base `.a: string`, one sample lacks `.a` -> accepted
  as `string?`, no line after; (2) base `.v: float`, samples `1.5` and `2`
  -> accepted as `float|integer`, no line after.

## Docs

- `README.md` (this package): flags table (`--accept`, `--terse` shows `?N`), the `shapes/` bullet
  (line ~52: now merged, `--reset`), the check step (line ~63: `?` unseen).
- `docs/recipes/check-for-drift.md`:
  - "Read the output": add the `?` unseen line (with a `(+N below)` example)
    to the example and the prefix table ("Not in this run's samples. Usually
    nothing to do."). In the table, drop the `~ optional -> required` row,
    add `~ kinds added`, and say which `~` rows `--accept` takes
    (`required -> optional`, `kinds added`) and which it doesn't
    (`kinds changed`). Explain that subset values print nothing.
  - New section "Accept drift into the baseline" for `--accept`: union
    semantics, the `could be accepted` hint, and that it doesn't gate on
    conform.
  - "Apply the drift" step 3: `infer` now merges; mention `--reset` (also
    needed for a real type change such as `object -> string` or
    `object -> array` on a path with descendants).
  - "Rule out noise first": note that unseen paths are already separated out.
- `docs/recipes/full-manual-workflow.md`: line ~84 ("If you skip step 2,
  `infer` rebuilds `shapes/` from the old data and the `+` lines come back")
  is no longer true for added paths; reword. Mention `--reset`, and that a
  real type change (`object -> string`, `object -> array`, ...) on a path with
  descendants needs `--reset`.
- `docs/recipes/read-reports-and-drafts.md#shape-snapshots`: baseline is a
  union across runs, not one run's output; paths seen in only some runs are
  marked `?`.
- Root `AGENTS.md` and `CONTRIBUTING.md` command lists: add
  `pnpm api-types:check --replay --accept` and `pnpm api-types:infer --reset`.

## Rollout

1. Implement §1 with tests.
2. §4 (diff) with tests. Run `pnpm api-types:check --replay --terse` and
   compare the counts with the last run: `-` should drop, `?` appear.
   Reference, from the first implementation against the current
   `.api-types/check/raw` (valid while that folder is unchanged): 317
   differences (`+68 -192 ~57`) before. With the subset rule it should be 98
   (`+68 ~30`) plus 192 unseen paths in 61 lines, and stderr should say 68
   paths and 30 values could be accepted.
3. §2 (`--accept`). Run `pnpm api-types:check --replay --accept`, review the
   `shapes/` git diff, then run `pnpm api-types:check --replay --terse` again
   and confirm the accepted paths produce no `+` lines and no
   `required -> optional` / `kinds added` lines. On the reference data that
   is 0 counted differences ("no shape drift") and no hint. Commit it on its
   own
   (`chore(api-types-infer): Accept drift into shapes`).
4. §3 (`infer` merge). Run `pnpm api-types:infer` and confirm `shapes/` has
   no diff (or only `~` value updates from the main cache). A clean diff can
   hide orphaned children, so also run the §1 round-trip check over the
   merged files (`normalizeSnapshot(file)` equals the file).
5. Docs.
6. Before finishing: `pnpm lint:check && pnpm typecheck && pnpm test` from the
   root (the SDK-specific typechecks aren't affected, but run the full list in
   AGENTS.md anyway).

No changeset: `api-types-infer` is private (`privatePackages.version: false`).

## Decisions (2026-11-21)

- **`--accept` takes `~` values with union semantics.** The baseline is a
  set of kinds plus an "absent somewhere" flag, unioned across runs. A value
  that only drops kinds or a `?` is a subset: no diff line, nothing to
  accept (§4). A value that only adds kinds or a `?` (`required ->
  optional`, `kinds added`) is new information, like a `+` path: `--accept`
  takes the union (§1). A value that adds and drops kinds (`kinds changed`)
  is a real type change: still `~`, never accepted, landed with
  `infer --reset`. On the last check run, the 36 `~` lines left after the
  first implementation were 25 `required -> optional` (future games without
  a score or clock, skaters without season stats), 5 `kinds added` and 6
  subsets (integer/float churn, `integer|null -> integer`), and conform had 0
  errors. Trade-off: the baseline only grows, so the diff no longer says when
  a kind stops appearing. That was already true of `?` fields, the diff is
  information only, and conform (which reads samples, not the baseline)
  still decides the exit code.
- **No `--strict`. Unseen paths stay separate, collapsed to subtree roots.**
  The 192 unseen paths on the last run were 61 subtrees, each rooted at a
  path the baseline already marks optional: `summary.iceSurface` (live games
  only, 126 lines in `matchUp` and `playByPlay`), about 45 localized name
  keys (`cs`, `fi`, `sk`, `de`, `es`, `sv`, `fr`), `radioLink` /
  `condensedGameFr` / `venueLocation.fr`, and rare events (`servedBy`,
  `seasonSeries[].clock`, `specialEvent.lightLogoUrl`). The fix for a `-` is
  "make it optional", and all of these already are, so showing them as `-`
  gives nothing to act on, and one run can't show a field is gone for good.
  Collapsing to roots takes the full output from 192 `?` lines to 61.
- **Hint on every run.** Without `--accept`, the stderr summary says how many
  paths and values `--accept` would take, on live, `--replay` and `--only`
  runs alike (§2). It reuses `acceptDrift`, so it costs nothing extra.
