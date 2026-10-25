# Read reports and drafts

`pnpm api-types:infer` writes three files per sample group. The report is the
evidence, the draft is a suggestion and the snapshot is the baseline for drift
checks.

```
.api-types/report/<group>.md     path table
.api-types/draft/<group>.mts     draft interfaces
shapes/<group>.json              committed snapshot
```

`<group>` is the endpoint name (`teams.teamRoster`), or the endpoint plus a
`groupBy` value (`stats.skaterStatsWithQueryContext.realtime`).

## Reports

```
| path | status | kinds | count | values | missing when |
| --- | --- | --- | --- | --- | --- |
| `.forwards[]` | required | object | 99 |  |  |
| `.forwards[].sweaterNumber` | optionals | integer | 98 |  |  |
| `.forwards[].lastName.fi` | optionals | string | 4 | Järnkrok, Kämpf, Macewen, Martshenko | team=UTA,season=20242025 |
| `.forwards[].positionCode` | required | string | 99 | R, C, L |  |
| `.defensemen[].positionCode` | required | string | 61 | D |  |
```

(Excerpt from `teams.teamRoster.md`.)

| Column | Meaning |
| --- | --- |
| path | `$` is the root, `.key` a property, `[]` an array item. Unwrapped endpoints start inside the unwrapped property. |
| status | `required` if every parent object has it, `optionals` if some lack it, `nullable` / `optional, nullable` if `null` was seen. |
| kinds | `string`, `integer`, `number`, `boolean`, `null`, `object`, `array`. A count in parentheses means only that many values had that kind, e.g. `integer \| null(3)`. |
| count | How many times the path appeared, across every sample and array item. |
| values | Distinct values, when there were 12 or fewer. These are enum candidates. |
| missing when | Up to 8 samples (by tags) in which no object had the field. Empty when the field is only missing from some items inside a sample, like one forward without a `sweaterNumber`. |

How to use it:

- **"missing when" explains optionality.** If a field is only missing from the
  `season=19992000` sample, it's a legacy-data gap, not a sometimes-sent
  field. It's still optional, but the JSDoc can say why.
- **A low count means weak evidence.** A field marked required from two
  objects isn't proven required. Add samples.
- **A short values list isn't the full set.** Only promote it to an
  `OpenUnion<...>` when the field really is an enum (state codes, position
  codes, period types).
- **Localized strings** show up as `default` plus optional language keys
  (`cs`, `fr`, `sv`, ...). The draft collapses these into `LocalizedString`.

## Drafts

The first line names the root type; the rest are interfaces:

```ts
// root: Roster
export interface RosterForward {
  id: number;
  firstName: LocalizedString;
  sweaterNumber?: number;
  positionCode: OpenUnion<'R' | 'C' | 'L'>;
  birthStateProvince?: LocalizedString;
}
```

What the emitter does for you:

- Optional and nullable follow the report exactly.
- Known enum-like keys (`gameState`, `positionCode`, `typeDescKey`, ...) become
  `OpenUnion<...>` of the observed values.
- Arrays of objects with a discriminant (`typeDescKey`, `positionCode`,
  `gameType`, `descKey`) become a union of one interface per variant.
- Objects keyed by IDs or dates become maps, as do paths in the spec's
  `emit.mapPaths`.
- Interfaces are named from the spec's `name` and the last segments of their
  path (`.forwards[]` in `Roster` becomes `RosterForward`), adding parent
  segments only on a clash. Override a name with `emit.names` (see
  [Endpoint specs](endpoint-specs.md)).

What it leaves to you:

- Reusing existing interfaces from `src/types/` instead of near-duplicates.
- Choosing names that read well in the public API.
- JSDoc.
- Moving discriminated unions into a registry (`PlayTypes`, `SkaterReportRows`,
  `GoalieReportRows`) so consumers can augment them.

The draft is regenerated on every `infer`. Never import from it.

## Shape snapshots

`shapes/<group>.json` is a flat, sorted map of path to kinds:

```json
{
  "$": "object",
  ".defensemen[]": "object",
  ".defensemen[].birthCity.default": "string",
  ".defensemen[].birthCity.fr": "string?",
  ".defensemen[].birthStateProvince": "object?"
}
```

Kinds are joined with `|` (`null|string`). A trailing `?` means the path is
missing from some parents. Snapshots are committed so that
`pnpm api-types:check` has something to diff against
([Check for API drift](check-for-drift.md)), and a diff in `shapes/` in a pull
request shows reviewers how the payload changed.
