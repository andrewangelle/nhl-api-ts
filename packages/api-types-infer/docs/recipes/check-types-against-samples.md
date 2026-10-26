# Check the types against the samples

`api-types:conform` compares the cached responses with what
`packages/nhl-api-ts/src/types/` actually declares, and fixes the mechanical
mismatches for you. It is the step to run after every re-probe.

```bash
pnpm api-types:conform                  # findings, exit 1 on errors
pnpm api-types:conform --fix            # dry-run diffs for the auto and propose tiers
pnpm api-types:conform --fix --write    # apply the auto tier, format, check again
```

| Flag | Effect |
| --- | --- |
| `--raw <dir>` | Read samples from `<dir>` instead of `.api-types/raw/`. Drafts go to the `draft/` dir beside it. |
| `--json` | Print every finding, with its tier and evidence, as JSON on stdout. |
| `--verbose` | List info findings too, instead of counting them. |
| `--fix` | Print the diffs the codemod would make. |
| `--write` | With `--fix`: write the auto tier to `src/types/`. |

It never touches the network. It reads the raw samples, so it works on the
same cache as `infer` and `fixtures`.

## Why not just diff `shapes/`?

`api-types:check` diffs today's shapes against yesterday's. Most of what it
reports needs no type change: a language key (`fr`, `cs`, ...) that shows up
on one sample and not another, `integer` vs `float`, a field that comes and
goes but is already optional, a new value of an `OpenUnion`. Conform compares
against the **declared** types (read through the TypeScript checker, so open
unions, `| null`, `?`, `Record<string, X>` and registry unions like `Play` are
understood), and reports only what the types don't already allow.

## Findings

Each finding has a kind, a severity, a confidence, the sample group and path,
the declaration it points at (`file:line`, interface, property) and its
evidence.

| Kind | Severity | Meaning |
| --- | --- | --- |
| `unexpected-null` | error | `null` seen, declaration not nullable. |
| `kind-mismatch` | error | A `string`/`number`/`boolean`/object/array the type doesn't allow. |
| `unknown-literal` | error | A value outside a **closed** literal union. |
| `new-literal` | info | A value outside an `OpenUnion`'s known list. |
| `missing-field` | error | A field the interface doesn't declare (and has no index signature). |
| `required-but-absent` | error | A required field some parent objects lacked. |
| `unknown-variant` | error | A discriminant value (`typeDescKey`, ...) with no union member. |
| `unseen-field` | info | A declared optional field no sample had. |
| `unresolved-type` | error | The group's type (from `specs.mts`) doesn't resolve. |

Paths use the snapshot syntax (`.a.b`, `[]` for array items, `$` for the
root). Inside a split union, `[]<goal>` names the variant.

Arrays of objects declared as a discriminated union (today, `Play` by
`typeDescKey`) are split by the raw elements, and each variant is checked
against its own member. Other unions use the loose rule: a field is fine if
any member has it, and optional if any member lacks it.

The default output lists errors and `new-literal`, grouped by declaration,
and counts the remaining info findings (mostly `unseen-field` on
`LocalizedString` keys). Each declaration line shows how many sample groups
reach it.

### Evidence and confidence

- **Independent samples.** `absent in 2/5 samples` counts raw responses, not
  array elements. Three players without a field in one roster are one sample.
- **Low confidence** marks findings inside an array whose element cap (4000)
  was hit, so the union split saw only a subset, and every finding in
  snapshot mode (see [History replay](#history-replay)).

## Tiers

Every finding lands in exactly one tier, shown in brackets after it.

| Tier | What happens | When |
| --- | --- | --- |
| `auto` | `--fix` shows the diff, `--write` applies it. | One correct edit, the interface is reached by one sample group only, it isn't in `common.mts` or a registry (`PlayTypes`, `SkaterReportRows`, ...), and the evidence passes the kind's threshold. |
| `propose` | `--fix` shows the diff. Never written. | The edit is mechanical, but one of those guards failed. The reason is shown, e.g. `[propose: used by 3 groups]`. |
| `report` | A line with a pointer to the draft. | Design decisions: a new object- or array-typed field, kind mismatches, literal and variant changes, unresolved types, fields missing from a union of several interfaces. |

The auto fixes:

- `missing-field` with a primitive or localized value: adds the field after
  the nearest preceding sibling (in the order the API sent them). It's
  optional if it was ever absent and `| null` if `null` was seen. When some
  sample tags never had it, a `// TODO(conform): seen in <tags>` line goes
  above it. Rewrite that as JSDoc, or delete it.
- `unexpected-null`: appends `| null`.
- `required-but-absent`: adds `?`, only when the field was absent in at least
  2 independent samples. With 1, it's a proposal.

Neighbouring JSDoc is kept and no JSDoc is added. Types that need
`OpenUnion`, `GameType` or `LocalizedString` get the import from
`common.mjs`.

The policy is data: `FIX_POLICY` in `src/codemod.mts` holds each kind's best
tier and threshold, so moving a kind between tiers is a one-line change.
Leave the 2-sample threshold alone until the forward record (below) supports
changing it.

## After a probe

```bash
pnpm api-types:fetch --refresh          # re-probe; plain fetch skips cached files
pnpm api-types:conform                  # read the findings
pnpm api-types:conform --fix            # review the diffs
pnpm api-types:conform --fix --write    # apply the auto tier
```

`--write` formats the touched files with Biome, runs conform again and checks
that every fixed finding is gone and no new error appeared. Then it prints the
regeneration commands to run:

```bash
pnpm openapi:schemas && pnpm api-types:fixtures && pnpm typecheck:test && pnpm typecheck:types && pnpm api:report && pnpm docs:llms
```

`typecheck:test` is what checks the regenerated fixtures against the types.

Then work through the propose diffs and the report lines by hand. For a
report line, open the draft it points at (`.api-types/draft/<group>.mts`,
regenerated by every conform run from the same samples) and follow
[Add a response type](add-a-response-type.md). Run conform again until it
exits 0, and finally `pnpm api-types:infer` to refresh the `shapes/` baseline.

Save the `--json` output of each run next to the commit that applies its
fixes (for example as a PR artifact). That forward record is the evidence for
changing tiers and thresholds later.

## Inside `api-types:check`

`api-types:check` refetches into `.api-types/check/raw/`, prints the shape
diff for information and then runs conform on that dir. Conform's errors are
its exit code, and its drafts go to `.api-types/check/draft/`, so its report
lines point at drafts from the same refetch. See
[Check for API drift](check-for-drift.md).

## History replay

`src/replay.mts` is a manual sanity check of the rules, never run in CI. It
runs conform in snapshot mode: the committed `shapes/` of one commit against
the types of another, checked out in a temporary `git worktree`:

```bash
cd packages/api-types-infer
node --conditions=source src/replay.mts --types 690992a~1 --shapes bd297ef --baseline 690992a~2
node --conditions=source src/replay.mts --types 28d8000~1 --shapes 28d8000 --baseline 28d8000~1 \
  --only players.playersByTeam,teams.teamRoster
```

`--baseline <rev>` prints only the findings that differ from a run on that
commit's shapes, which cancels out findings both have. `--fix` prints the
codemod's diffs (all `propose` in snapshot mode).

Snapshots keep only kinds and an optional flag: no values, elements or sample
counts. So only the kind, null, presence and missing-field rules apply,
unions can't be split, and every finding is low confidence.

The second command is a negative control. `28d8000` only added localized
keys, so the only difference must be 10 `unseen-field` entries disappearing.
With one real drift pair in the history, replay results are anecdotes. Don't
use them to move kinds between tiers.
