# Plan: a codemod that turns future API drift into SDK type changes

## Goal

Every time the API is probed again (`pnpm api-types:fetch --refresh`; without `--refresh` it only fetches files
missing from the cache),
the drift should become, with no hand triage:

1. a short list of **real** mismatches between what the API sent and what
   `packages/nhl-api-ts/src/types/` declares,
2. **edits applied automatically** where exactly one edit is correct and safe,
3. **proposed diffs** where an edit is likely right but needs a person to
   accept it,
4. **report lines** (with a pointer to the draft) for everything that is a
   design decision.

The codemod is the product. The conformance check (Phase 1) is its triage
stage. It's built first because no edit is trustworthy until the drift has
been sorted correctly.

## Why compare against the types, not against the previous shapes

Today's drift signal is `check.mts`: shape snapshot vs shape snapshot. It
reports every change in what was *observed*, whether or not the declared
types already allow it. Classes of drift that are expected to be common and
need no type edit:

- **Localized-key churn**: a language key (`fr`, `cs`, …) shows up on one
  sample and not another. `LocalizedString` already declares them optional.
- **Numeric subtype changes**: `integer` ↔ `float`. Both are `number`.
- **Fields that come and go when the types already say optional**: the
  declaration already allows the absence.
- **New values in an open union**: `OpenUnion` already accepts any string.

Drafts can't be the codemod's source either. They name interfaces by JSON
path, while the SDK uses curated, shared, deduped types with JSDoc.
Regenerating from drafts would throw that away.

**Hypothesis to test, not assume:** most shape drift needs no type change, and
most of the type changes that are needed fall into a few mechanical classes.
The Evaluation section tests both: synthetic drift-class tests now, and the
forward record of future runs over time. The repo's history is too thin to
measure them (one real drift pair), so it serves only as a sanity check.

## Model

### Observations (from api-types-infer)

Merged shapes of real responses. Each node carries evidence:
- the kinds seen and how often
- presence vs the parent object count
- null seen
- value sets (capped)
- raw array elements, for splitting unions
- **independent-sample evidence**: how many distinct raw responses showed an
  absence

Evidence strength is a first-class input to every decision. One response that
lacks a field is weak evidence; absences across several independent responses
are strong.

### Declarations (from the SDK)

The **resolved** TypeScript type for each endpoint group, read through the
type checker, not by parsing text. Semantics that matter:
- open vs closed literal unions
- nullable and optional members
- string index signatures (dynamic-key maps)
- discriminated object unions (registry-built, e.g. `PlayTypes`)
- which declaration (interface + field, file:line) each part comes from

### Conformance rules

Walk each observed shape alongside its declared type. Every mismatch becomes a
finding `{ kind, severity, confidence, group, path, declaration, evidence }`.

| Observation | Declaration | Finding |
|---|---|---|
| null seen | not nullable | `unexpected-null` (error) |
| kind not allowed (`string`/`number`/`boolean`) | — | `kind-mismatch` (error); integer vs float is never a mismatch |
| value outside a **closed** literal union | — | `unknown-literal` (error) |
| value outside an **open** union's known list | — | `new-literal` (info) |
| property observed | absent, no index signature | `missing-field` (error) |
| property sometimes absent | required | `required-but-absent` (error) |
| discriminant value with no union member | — | `unknown-variant` (error if closed) |
| declared property | never observed | `unseen-field` (info, never fails) |
| endpoint group | type can't be resolved | `unresolved-type` (error) |

Each finding's confidence comes from its evidence. One example: a finding
inside a union whose element cap was hit is low-confidence.

The walker also records **declaration usage**: which endpoint groups reach
each interface. That gives each interface's blast radius.

### Fix policy (the codemod)

Every finding lands in exactly one tier:

| Tier | What happens | When |
|---|---|---|
| **Auto** | edit is written (dry-run diff first, `--write` to apply) | the finding has one correct edit, the target interface is used by one group only, the target isn't `common.mts` or a registry, and the evidence passes that kind's threshold |
| **Propose** | a diff is printed, not applied | the edit is mechanical, but its blast radius or evidence keeps it out of Auto |
| **Report** | a finding line, plus pointers to `docs/recipes/add-a-response-type.md` and to `<raw dir>/../draft/<group>.mts`, the draft dir beside the raw dir conform read (`.api-types/draft/` for `RAW_DIR`, `.api-types/check/draft/` for `CHECK_RAW`). Conform always regenerates that dir with the same `draftFor` helper as `infer`, so the draft matches the samples the finding came from | design decisions: new object-typed fields, new endpoints, new variants, kind mismatches, closed-union changes |

Initial Auto set:
- `missing-field` with a primitive or `LocalizedString`-shaped value → add the
  field. Make it optional if it was ever absent; add `| null` if null was seen.
- `unexpected-null` → append `| null`.
- `required-but-absent` → add `?`, **only** when the absences span ≥ 2
  independent raw samples. Fewer than that drops it to Propose.

The tier rules are written as data, so moving a finding class between tiers
is a one-line change when the evaluation supports it.

After any write:
- run conform again; the fixed findings must be gone and no new errors may
  appear
- print the regeneration commands:
  `pnpm openapi:schemas && pnpm api-types:fixtures && pnpm typecheck:test && pnpm typecheck:types && pnpm api:report && pnpm docs:llms`
  (`typecheck:test` is what checks the regenerated fixtures against the types;
  `typecheck:types` covers only `augmentation.typetest.mts`)

## Workflow after each future probe

Every step reads the same directory, `RAW_DIR` (`${CACHE_DIR}/raw`), the one
`infer` and `fixtures` already read. `conform` takes `--raw <dir>` (default
`RAW_DIR`), like `fetch.mts` has `--out`, and writes drafts to the `draft/`
dir beside whichever raw dir it read. It never writes another dir's drafts,
so `.api-types/draft/` always matches `.api-types/report/` (both from
`RAW_DIR`).

```
pnpm api-types:fetch --refresh  # re-probe; plain fetch skips files already cached
pnpm api-types:conform          # findings, grouped by declaration, exit 1 on errors;
                                # also rewrites .api-types/draft/ (beside RAW_DIR, via draftFor)
pnpm api-types:conform --fix    # dry-run diffs for Auto + Propose
pnpm api-types:conform --fix --write
# then the regeneration commands it prints, and review Report lines by hand
pnpm api-types:infer            # last: refresh shapes/ baseline once the types are settled
```

`api-types:check` is not part of this sequence: it deletes and refetches into
`CHECK_RAW` (`${CACHE_DIR}/check/raw`), not `RAW_DIR`. Its conform pass reads
`CHECK_RAW` (via `--raw`) and uses conform's errors as its exit code; the
shape-vs-shape diff stays as informational output. Its conform pass writes
drafts to `.api-types/check/draft/`, beside `CHECK_RAW`, so its Report lines
point at drafts from the same refetch.

## Evaluation (instead of a fixed baseline)

1. **Drift-class tests (synthetic).** One unit test per class, built from
   inline samples and small in-memory types, never from the current cache:
   - each no-op class from "Why compare against the types" produces no finding
   - each finding kind is produced by a minimal mismatch
   - each Auto fix produces the expected text and keeps neighboring JSDoc
   - each tier guard holds:
     - shared interface → not Auto
     - `common.mts` or registry → not Auto
     - single-sample absence → not Auto
     - two elements from one raw sample count as one sample, including inside
       a union member
     - a sometimes-`null` parent doesn't make its children "absent"
2. **History replay (measured, manual, n=1).** The repo history has exactly
   one real drift pair: probe commit `bd297ef` ("Update types after new api
   probe") with `690992a`. The other `shapes/` commits (`946a09a`, `8ed3da5`,
   `55229d2`, `2ae48bb`) add endpoints, which against "before"
   types yield only `unresolved-type` or Report findings; `28d8000` adds
   endpoints and also modifies two shapes (see the negative control below);
   `616b5ba` changes
   types with no matching shapes commit. For the pair:
   - check out the types from *before* the type commit
   - run conform in **snapshot mode** against the `shapes/` from the probe
     commit (see Appendix A.5: committed snapshots carry only path, kinds and
     optional flag, so only the kind, null, presence and missing-field rules
     apply)
   - compare the findings, and what `--fix` would write, against the type
     edits that were actually committed

   **Negative control: `28d8000`.** It adds 6 shapes and modifies 2
   (`players.playersByTeam.json`, `teams.teamRoster.json`). The modifications
   are pure localized-key churn (`.forwards[].lastName.de/es`,
   `.goalies[].firstName.cs/sk`, `.goalies[].lastName.fi`, all `string?`).
   **Pass criterion:** run conform in snapshot mode on both the `28d8000~1`
   and `28d8000` versions of the two shapes, against the same `28d8000~1`
   types. The two finding sets must differ only by `unseen-field` (info)
   entries disappearing for the 5 added paths in each file (10 paths in
   all): `.forwards[].lastName.de/es`, `.goalies[].firstName.cs/sk`,
   `.goalies[].lastName.fi`. Any finding that appears on those paths, or any
   other difference between the sets, means a no-op rule is wrong.

   Don't require zero errors overall. Snapshot `?` only means "not present
   in every parent object", and snapshot mode has no sample counts to weigh
   it. So required-but-absent can fire on unrelated paths in both versions,
   and the diff cancels those out. Report the absolute error count for
   information only.

   Report precision and recall for that pair as a sanity check only. With one
   pair they are anecdotes: they are **not** the basis for moving finding
   classes between tiers or for lowering the ≥ 2-sample guard. Tier decisions
   lean on the synthetic tests and the forward record, and the guard stays
   until the forward record grows. This is a manual script, not CI.
3. **Forward record.** Save each future run's `conform --json` output next to
   the commit that applies its fixes (for example as a PR artifact). Over time
   that grows an evaluation set with full evidence, beyond what snapshots
   keep.

## Phases

1. **Phase 0, compiler access.** A type loader that resolves an endpoint
   group's declared type from the SDK's real tsconfig (Appendix A.1).
2. **Phase 1, conform.**
   - observation evidence additions (A.2)
   - endpoint → type mapping shared with fixtures (A.3)
   - walker and rules, including union splitting (A.4)
   - output and declaration usage
   - extract a `draftFor(group, shape)` helper (root name plus file text) from
     the draft-writing part of `infer.mts`'s `import.meta.main` block (A.7). It owns the
     grouped-endpoint root name (`${spec.name}${GroupName}`, e.g.
     `SkaterRowSummary`) and the `// root: ${type}\n…` file header. Both
     `infer` and `conform` call it; calling `emitFor(shape, specFor(endpoint))`
     directly would name grouped stats drafts `SkaterRow`/`GoalieRow`/…
   - the `--raw <dir>` option, with drafts regenerated (via `draftFor`) into
     the `draft/` dir beside the raw dir conform reads
   - package wiring: add `"conform": "node --conditions=source src/conform.mts"`
     to `packages/api-types-infer/package.json` scripts and
     `"api-types:conform": "pnpm --filter api-types-infer run conform"` to the
     root `package.json`; add `ts-morph` to api-types-infer's devDependencies
     (Phase 0 needs it for the loader)
   - wiring into `check.mts` (conform reads `CHECK_RAW`)
   - drift-class tests, plus a check that `infer` and `conform` produce
     byte-identical drafts from the same raw dir
3. **Phase 1.5, evaluation.** History replay (A.5, n=1). Sanity-check the rules
   before any writes are enabled; tiers rest on the synthetic tests.
4. **Phase 2, codemod.** The Auto and Propose tiers (A.6), dry-run by default.
   The tier-guard tests.
5. **Phase 3 (optional), one type reader.** Move `openapi.mts` from
   text parsing to the same type loader. Merge only if `openapi.yaml` comes out
   byte-identical.
6. **Docs.**
   - new recipe `packages/api-types-infer/docs/recipes/check-types-against-samples.md`
     (findings, tiers, the per-probe workflow)
   - update `check-for-drift.md` and `read-reports-and-drafts.md`
   - `AGENTS.md`: commands list, plus a note that conform enforces the
     response-type rules; also fix the response-type rules bullet under
     Conventions, which says to run `pnpm typecheck:types` after adding a
     trimmed fixture (A.7). Change it to
     `pnpm typecheck:test` (`typecheck:types` excludes the fixtures), in line
     with the regeneration commands conform prints
   - no changeset for `api-types-infer` (private). Type edits the codemod
     makes get a changeset at the user's discretion.

Before finishing each phase, run from the root:
`pnpm lint:check && pnpm typecheck && pnpm typecheck:test && pnpm typecheck:examples && pnpm typecheck:types && pnpm typecheck:scripts && pnpm test`.

## Later: more sources of declarations and observations

These fit the same model as additional rule inputs. They aren't needed for the
first version:
- the stats API's own `misc.config`: report types vs the report registries,
  and per-report column lists vs the row types
- default sort `property` names vs the row types
- structural reuse: a new object field whose shape matches an existing
  interface (`TeamLogo`, `GameOutcome`, …) moves from Report to Propose
- forking a shared interface for one group (`interface X… extends X`) as a
  Propose fix
- known-value additions to open unions as Auto (they can't break consumers),
  once the forward record supports it (replay can't: snapshots keep no value
  sets)
- reverse "looser than observed" findings (optional fields that are always
  present, `| null` never seen) as info
- unseen-field coverage reports that point at fetch-matrix gaps

## Appendix A: implementation notes (current codebase)

These hold as of writing. This is the part to audit against the code; the
sections above should stay valid across refactors.

### A.1 Compiler API

- TypeScript 7's package exposes a JS API only under its `./unstable/*`
  exports (no stable `createProgram`, no editing API). Use **ts-morph** as a
  devDependency of `api-types-infer`.
  - ts-morph 28 bundles TypeScript 6.0 through `@ts-morph/common` 0.29.
  - Its manipulation API keeps JSDoc and formatting intact.
  - `api-types-infer` is private, so this doesn't affect the SDK's
    no-runtime-deps rule.
- Load `packages/nhl-api-ts/tsconfig.json`. `tsconfig.base.json` already sets
  `customConditions: ['source']`. Check once that TS 6.0 loads it without
  deprecation warnings or diagnostics.
- Resolve a type expression by adding an in-memory file **under
  `packages/nhl-api-ts/src/`** (the tsconfig has `rootDir: ./src`, so a file at
  the package root would get a "not under rootDir" diagnostic; alternatively
  override `rootDir` as `test/tsconfig.json` does). The file imports `#src/index.mjs` (or `nhl-api-ts`). `#src` resolves
  through the importing file's nearest `package.json`, and api-types-infer's
  own `#src` doesn't reach the SDK. One alias per expression handles
  `SkaterReportRows['summary']` the same way as plain names.
- Fallback if ts-morph won't do: alias `typescript@5.9.3` (already in the store
  through api-extractor) and do Phase 2 as position-based text edits.
  ts-morph can't take an external `ts`.

### A.2 Observation evidence

The current shape tree doesn't track independent-sample absence:
- `seenIn` records presence.
- `missingIn` records a tag only when a field is missing from **every** object
  in a sample. Alias endpoints also share tag labels.
- The per-node sample counter goes up on every merge, including `null` and
  non-object values.

Add:
- a per-sample **object** counter
- a set of raw sample IDs in which the field was absent from some or all of
  that sample's objects
- the raw sample ID on each stored array element, so a union split can group
  elements back by response instead of treating each element as a sample

Keep existing `missingIn`, `snapshot()` and draft output unchanged. Verify
that `shapes/` and the drafts come out byte-identical.

### A.3 Endpoint → type mapping

- `specFor(endpoint).name`, plus the registry indexing used in `fixtures.mts`
  (`SkaterReportRows[...]`, `GoalieReportRows[...]`, `SkaterLeaderRows[...]`,
  `GoalieLeaderRows[...]`), already names a real exported type. The typed
  fixtures and `pnpm typecheck:test` validate it.
- Move it into `specs.mts` as one function used by both scripts. It returns
  the item type; `fixtures.mts` keeps its own `[]` handling, so fixture output
  stays identical.
- Decide array roots the way `emitFor` does (the shape is an array with
  items), not by `unwrap`. Endpoints without `unwrap` can return arrays too.

### A.4 Walker details

- Normalize types first:
  - strip `null`/`undefined` and record whether null is allowed
  - stop at `unknown`/`any`
  - treat `string & {}` / `number & {}` in a union as open
- String index signatures: walk every observed key against the value type.
- Raw elements live on the **array** node, not its items. Split a union where
  the walk reaches an array whose element type is a discriminated object
  union, by the discriminant keys `emit.mts` already uses.
  - Today the only such union is `Play` (from `PlayTypes`, keyed by
    `typeDescKey`).
  - Otherwise use the loose rule: a prop is fine if any member has it, and is
    optional if it's optional or missing on any member.
- Export from `emit.mts` what conform and the codemod reuse:
  - the discriminant and enum key lists
  - the per-variant shape builder
  - the primitive/`OpenUnion` type-text mapping

  Drafts must come out unchanged.

### A.5 Snapshot mode, for history replay

- Committed `shapes/*.json` hold only `path → kinds[?]`, so replay can apply
  the kind, null, missing-field and presence rules, but has no sample-count
  evidence and no value sets. Mark replay findings accordingly.
- Use `git worktree` (in the job's temp dir) to get the types at each "before"
  commit.

### A.6 Codemod mechanics

- ts-morph `addProperty` / `setType` / `setHasQuestionToken`.
  - Insert new fields after the closest preceding sibling in observed key
    order. Fall back to the end.
- Add no JSDoc. Do add a `// TODO(conform): seen in <tags>` note on an
  optional field whose presence depends on tags.
- Format only the touched files: `pnpm exec biome check --write <files>`.
  `pnpm lint:fix` rewrites the whole repo.

### A.7 Locations referenced above

- `draftFor` source: `infer.mts` lines 129–142 (the `groupName` / `emitFor` /
  `writeFileSync(DRAFT_DIR…)` part of the main block).
- The `AGENTS.md` fixture instruction: lines 118–119, the response-type rules
  bullet ("Add a trimmed fixture (`pnpm api-types:fixtures`) and run
  `pnpm typecheck:types`").

## Risks / open questions

- **Evidence thresholds** (≥ 2 independent samples) are a starting guess.
  They stay until the forward record is large enough to revisit them.
- **The replay corpus is one drift pair and snapshot-only**, so its
  precision/recall is anecdotal and must not drive tier changes. The forward
  record fixes this over time.
- **The element cap** (4000 per node) limits union splitting; mark those
  findings low-confidence.
- **TS 6.0 vs the SDK's TS 7 build**: the resolved types could differ in
  edge cases. `pnpm typecheck` stays the final word after any write.
