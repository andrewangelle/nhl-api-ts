# Plan: typed responses from live NHL API probing

## Goal

Replace every `JsonObject` / `JsonObject[]` (`Record<string, any>`) return type in
`src/api/*.mts` with a named, exported interface. Each interface is derived from
real responses fetched from `api-web.nhle.com` and `api.nhle.com`. Consumers can
extend any of these types without forking the SDK. That covers fields we missed
and fields the NHL adds after we publish.

Non-goals:

- Runtime validation. We stay at zero dependencies, and responses pass through
  untouched (AGENTS.md: "Responses pass through untouched").
- Renaming payload fields.
- Typing CLI internals (`src/cli/commands.mts` `values: any`). CLI output stays
  `unknown` JSON.
- Calling the live API from tests or CI.

## Findings that shape this plan (checked on 2026-10-17)

1. **Shapes depend on the variant you request.** One sample per endpoint is not
   enough. For example, in play-by-play for `2023020280`, `plays[].details`
   differs completely by `typeDescKey`:
   - `goal` has `scoringPlayerId` and `highlightClip`, and optionally
     `assist1PlayerId`, `assist2PlayerId` and `goalInGame`.
   - `faceoff` has `winningPlayerId` and `losingPlayerId`.
   - `period-start` and `game-end` have no `details` at all.
   - `stoppage.secondaryReason` shows up in only some stoppages.

   So arrays of events have to be modeled as discriminated unions. A single
   merged bag of optional fields would be wrong.
2. **Some responses use dynamic keys.** `misc.config` returns
   `playerReportData.{summary, realtime, bios, ...}`, which is keyed by report
   name. These become `Record<string, T>` or mapped types, not fixed interfaces.
   `config` also lists every skater, goalie and team report type, so the probe
   can use it to enumerate the stats variants.
3. **Interface augmentation works through the root barrel.** I tested with
   TypeScript 5.9.3 and 7.0.2. A consumer's
   `declare module 'pkg' { interface X { extra: string } }` merges into an
   interface that `index.d.mts` re-exports by name (`export type { X } from
   './types/...'`). The original fields stay, unknown fields still error, and the
   augmentation applies across the whole project. This is the extension
   mechanism (see Design).
4. **`Bound<>` in `src/nhl-client.mts` erases generics.** I tested both the
   current `infer Args` form and an `OmitThisParameter` form. A method like
   `<K extends keyof SkaterReportRows>(ctx, { reportType: K }) => Promise<Rows[K][]>`
   collapses to the union of all row types once it is bound. Report-typed stats
   methods therefore need an explicit signature override on the client type.
5. Some params change the response shape and must be probed both ways:
   - `aggregate` / `isAggregate`: `seasonId` and similar fields drop out.
   - `teamSummary({ isGame: true })`: adds `gameId` and `gameDate`.
   - `shiftChartData({ excludes })`: `eventDetails` is removed by default.
   - The skater vs goalie player id changes `playerCareerStats`, edge and
     roster shapes.

## Design

### File layout

```
src/types/
  common.mts         LocalizedString, TeamRef, PeriodDescriptor, GameState, GameType,
                     PositionCode, OpenUnion, StatsApiPage<Row> = { data: Row[]; total: number }, ...
  teams.mts          Roster, RosterPlayer, Franchise
  standings.mts      LeagueStandings, StandingsEntry, StandingsSeason
  schedule.mts       WeeklySchedule, ScheduleGame, ClubScheduleGame, TeamSeasonSchedule,
                     CalendarSchedule, PlayoffCarousel, PlayoffSeriesSchedule, PlayoffBracket,
                     OddsPartner
  game-center.mts    Boxscore, PlayByPlay, Play (union), PlayTypes (registry), GameLanding,
                     DailyScores, ShiftChart, ShiftEntry, RightRail, GameStory
  stats.mts          PlayerLanding, GameLogEntry, ClubStatsSeason, TeamSummaryRow,
                     SkaterReportRows / GoalieReportRows registries + one row interface per report
  misc.mts           GlossaryEntry, StatsConfig, Country, SeasonRules, DraftYear
  players.mts        Prospects
  edge.mts           one interface per edge endpoint (23) + shared EdgeMeasurement etc.
  helpers.mts        AllPlayersEntry, PlayerSummaryStatistics (SDK-built shapes)
  index.mts          barrel: `export type { ... }` by name
```

`src/index.mts` re-exports every response type **by name**, for example
`export type { Boxscore, PlayByPlay, ... } from '#src/types/index.mjs'`.
Namespace exports such as `export * as gameCenter` cannot be augmented, and
api-extractor reports `ae-forgotten-export` for types that aren't exported by
name. Phase 0 checks whether `export type * from` also augments correctly. If it
doesn't, we stay with explicit names.

`Team` and `DailySchedule` stay where they are, and stay exported from
`src/index.mts` as today (`DailySchedule` at line 14 from `#src/api/schedule.mjs`, `Team` at line 25
from `#src/api/teams.mjs`). They are left out of the `src/types/` barrel, because a
second named re-export of the same names would be a duplicate export.
`DailySchedule.games` becomes `ScheduleGame[]`.

### Extension mechanism (the consumer contract)

1. **Every object type is an `interface`, never a `type` alias**, so consumers
   can merge into it:

   ```ts
   declare module 'nhl-api-ts' {
     interface Boxscore { someNewField?: string }
     interface RosterPlayer { contractExpiry?: string }
   }
   ```

   This also covers nested shapes, because each nested object is its own named
   interface: `TeamRef`, `GoalPlayDetails`, `EdgeShotSpeed`, and so on.
   Anonymous inline object literals are not allowed in response types. They
   can't be augmented.

2. **Unions are built from augmentable registries**, because a `type` union
   can't be merged:

   ```ts
   export interface PlayTypes {
     goal: GoalPlay; 'shot-on-goal': ShotOnGoalPlay; faceoff: FaceoffPlay; ...
   }
   export type Play = PlayTypes[keyof PlayTypes];
   ```

   A consumer adds a new event with
   `interface PlayTypes { 'new-event': NewEventPlay }`. The same pattern applies
   to `SkaterReportRows`, `GoalieReportRows`, and any other variant set found
   during inference (for example, a player-landing skater/goalie split).

3. **Open enums.** Use `export type OpenUnion<Known extends string> = Known |
   (string & {})` for values like `gameState`, `gameScheduleState`, `zoneCode`,
   `shotType`, `positionCode` and `periodType`. Autocomplete still works, and new
   values from the NHL don't break consumers. Numeric codes such as `gameType`
   are handled the same way: `1 | 2 | 3 | (number & {})`.

4. **No index signatures** (`[key: string]: unknown`) on response interfaces.
   They would hide typos and make augmentation pointless. Dynamic-key objects
   (point 2 in Findings) are the exception: they use `Record<string, T>`.

5. **Per-call escape hatch.** This is documented, not built. When one call site
   needs a field that isn't typed, write `await client.x.y() as Y & { z: number }`.
   We don't add `<T>` generics on every method, because `Bound<>` erases them
   (Findings point 4). It isn't worth rewriting the binder for this.

6. **Locking the contract in.** Add `test/types/augmentation.typetest.mts` with
   its own `test/types/tsconfig.json`, compiled by
   the new `pnpm typecheck:types` script (`tsc -p test/types`), which CI runs
   (see Phase 0). Like `examples/tsconfig.json`, that tsconfig maps
   `"nhl-api-ts": ["../../src/index.mts"]` in `paths`, so the test exercises the
   public package name. It extends `../../tsconfig.json` and must override the
   root's `"rootDir": "./src"` the way `examples/`, `test/` and `scripts/`
   tsconfigs do, or tsc rejects the files with TS6059. Its `compilerOptions`
   are `"rootDir": "../.."`, `"noEmit": true`,
   `"paths": { "nhl-api-ts": ["../../src/index.mts"] }`, plus
   `"allowImportingTsExtensions": true` if it imports with a `.mts` specifier.
   It must also set its own `"include": ["./**/*.mts"]`. The root tsconfig has
   `"include": ["src/**/*.mts"]`, and an inherited `include` resolves relative to
   the base file, so without an override `tsc -p test/types` would only check
   `src/`, never compile `augmentation.typetest.mts`, and pass vacuously. The
   other sub-configs (`examples/`, `test/`, `scripts/`) each set the same
   override. Prove the file is really compiled with a deliberate failure check
   (for example, temporarily add a bad `// @ts-expect-error` over a valid line
   and confirm `pnpm typecheck:types` fails, then revert it).
   It must be isolated: `test/tsconfig.json`
   compiles `./**/*.mts` as one program, and augmentation applies across the
   whole program, so the file has to stay out of that program (exclude
   `types/**` in `test/tsconfig.json`, and exclude fixtures from the new
   tsconfig). The `.typetest.mts` suffix keeps it out of the
   `node --test "test/**/*.test.mts"` glob, so it never runs at runtime. Every
   augmented field is also optional, as a second guard. The file augments
   `Boxscore`, `PlayTypes`, `SkaterReportRows` and a nested type through
   `declare module 'nhl-api-ts'`, then asserts that the new fields are
   typed. Add `// @ts-expect-error` lines to prove that unknown fields still
   fail. If a refactor turns an interface into an alias, this test breaks.

### Optionality and nullability rules

The inference tool applies these rules per JSON path, within the parent object
the path belongs to:

| Observation across all samples where the parent exists | TS output |
| --- | --- |
| Present in 100% of samples, never `null` | `field: T` |
| Present in 100%, sometimes `null` | `field: T \| null` |
| Present in some samples | `field?: T` (`\| null` too if `null` was seen) |
| Present only in some variants of a discriminated union | Required on those variant interfaces, absent from the others |
| Seen in fewer than 3 samples | Use the rule above, and add a `/** Low sample count */` note in the draft for review |

When a field is optional, the generated JSDoc names the sample tags where it was
missing, for example `/** Absent when gameState is FUT */` or
`/** Absent for goalies */`. These notes come from the tag metadata described
below. They tell consumers why the field can be missing, not only that it can.

## Implementation phases

### Phase 0: Probe and inference tooling (`scripts/probe/`)

These are dev-only scripts. They are typechecked by `scripts/tsconfig.json`,
never shipped, and never run in CI (only typechecked, see below). Setup required
first:

- Add `package.json` scripts `typecheck:types` (`tsc -p test/types`) and
  `typecheck:scripts` (`tsc -p scripts`), and call both from the Typecheck step
  in `.github/workflows/pr.yml` (which today runs only `pnpm typecheck`,
  `pnpm exec tsc -p test` and `pnpm typecheck:examples`). Without this, neither
  the augmentation test nor the probe scripts are checked on PRs.
- Add `"allowImportingTsExtensions": true` to `scripts/tsconfig.json`. Node needs
  `./samples.mts`-style specifiers at runtime, and tsc rejects them without the
  flag (`test/tsconfig.json` already sets it).
- Add `"!**/.probe"` to `files.includes` in `biome.json`, alongside the
  `.gitignore` entry. `biome.json` sets `vcs.useIgnoreFile: false`, so Biome
  doesn't read `.gitignore`, and `files.includes` has `"**/*.json"`, which
  already covers dot-folders. Without the exclusion, `pnpm lint:check` would
  format-check and lint every raw NHL payload under `.probe/` after
  `probe:fetch`.
- Add `package.json` scripts `probe:fetch`, `probe:infer` and `probe:check`,
  each as `node --conditions=source scripts/probe/<x>.mts`. The `source`
  condition is required because `#src/*` maps to `dist` otherwise. No script in
  `scripts/` has imported `#src/*` before, so this is new.

1. **`scripts/probe/samples.mts`**: a declarative sample matrix. Each endpoint
   maps to an array of `{ tags: Record<string,string>, call: (client) => Promise<unknown> }`.
   Calls go through the real SDK (`createNHLClient()`), so each sample also
   tests the URL. The matrix must cover at least the following:
   - **Game ids**:
     - Regular-season final, e.g. `2023020280`.
     - An OT final and a shootout final (pick both from `dailyScores` history).
     - Playoff game `2023030411`.
     - A preseason game.
     - A future game (`gameState=FUT`) and, if one exists when the probe runs, a
       `LIVE`/`CRIT` game, both taken from `dailyScores({})` at run time.
     - An old game, e.g. from the 1990s, to catch sparse legacy payloads.
   - **Players**:
     - Active skater `8478402`, active goalie `8476945`.
     - Long-career skater `8471214`, retired player `8448208`.
     - A rookie and an unsigned prospect (from `prospectsByTeam`).
   - **Teams**:
     - `BUF`, `TOR`, `UTA`, `SEA`.
     - Defunct `ARI` with season `20232024`, for roster and club-schedule.
     - `club-stats-season` for an Original Six team and an expansion team.
   - **Dates and seasons**:
     - The current season (`now`), `20232024`, `19992000`.
     - An offseason date with no games, the playoff window, and the All-Star
       break.
     - Standings for an early season such as `19171918` (different rules flags).
   - **Stats**:
     - Every skater, goalie and team report type listed by `misc.config`.
     - Each one with `aggregate` true and false. `teamSummary` also with
       `isGame` true and false.
     - `playerGameLog` for each game type (1, 2, 3).
   - **Edge**:
     - Each skater endpoint with a skater, each goalie endpoint with a goalie,
       and team endpoints for two teams.
     - Each of those for `now` plus `20232024` with game types 2 and 3.
     - Landing endpoints with and without a season.
   - **Shift charts**: default `excludes` and `excludes: []`.
   - **Error and empty cases**: these are recorded for documentation only and
     don't affect the types. Examples are an invalid game id and a team with no
     prospects.
2. **`scripts/probe/fetch.mts`** (`pnpm probe:fetch`): runs the matrix one
   request at a time with a 250 ms delay. It writes each raw response to
   `.probe/raw/<endpoint>/<tag-slug>.json`, plus a `meta.json` with the URL,
   tags and status. Responses are cached on disk, so rerunning only fetches
   what's missing; `--refresh` forces a new fetch. Add `.probe/` to `.gitignore`
   and exclude it from Biome (see setup above).
3. **`scripts/probe/infer.mts`** (`pnpm probe:infer`): merges all samples of an
   endpoint into a shape tree. Each node records:
   - the kinds seen (`string | number(int/float) | boolean | null | object | array`),
   - an occurrence count against the parent's count,
   - which tags it was missing under,
   - up to 25 distinct string or number values, used to suggest enums,
   - for arrays, the merged shape of the items.

   Heuristics:
   - **Discriminated unions**: for arrays of objects, test candidate keys from a
     configured list (`typeDescKey`, `positionCode`, `gameType`, ...) plus any
     string field that is always present and has at most 30 distinct values.
     Split into variants when the field sets differ meaningfully (Jaccard
     similarity below 0.8).
   - **Dynamic-key maps**: treat an object as a `Record` when its key set
     differs across samples, or when its keys look like ids, dates, season ids
     or report names. Use a config list for known map paths, such as
     `misc.config.*ReportData`.
   - **Localized strings**: an object with `default: string` and optional
     language keys becomes `LocalizedString`.

   Outputs:
   - `.probe/report/<endpoint>.md`: a table of paths with required, optional
     and nullable status, types, enum candidates, and "missing when" tags.
   - `.probe/draft/<endpoint>.mts`: draft interfaces that follow the Design
     rules.
4. **`scripts/probe/shapes/<endpoint>.json`** (committed): a compact, normalized
   shape snapshot (paths, kinds, required flag) with no payload data. It is
   small, and it is the baseline for drift detection (Phase 6). These files sit
   under `scripts/`, which Biome checks, so `infer.mts` must write them in
   Biome-compatible form, or run `pnpm exec biome format --write
   scripts/probe/shapes` after writing them.
5. Prove the extension mechanism before any types land. Add `src/types/common.mts`
   and the `test/types/augmentation.typetest.mts` skeleton plus
   `test/types/tsconfig.json` (with `rootDir: "../.."`, `noEmit: true`,
   `include: ["./**/*.mts"]` and the `nhl-api-ts` `paths` mapping; see Design §6).
   Run the deliberate-failure check from Design §6 to confirm the file is
   compiled. Settle `export type *` versus named re-exports.

### Phase 1: Shared types

Use the drafts to pull out repeated shapes into `src/types/common.mts`. Expected
shared types include `LocalizedString`, team references (abbrev, name, logo,
darkLogo, id), `PeriodDescriptor`, `GameClock`, `TvBroadcast`, `Venue`, player
name fields, `GameState` / `GameScheduleState` / `GameType` open unions,
`SeasonId`, and `StatsApiPage<Row>`.

The rule is: a shape becomes common only if it appears, structurally identical,
in at least 2 endpoints. Otherwise it stays in its module file. Don't force
shapes to merge.

### Phase 2: Simple modules

Do these in this order. Each one includes its types, return type changes and
helper fixes.

1. `misc`: `GlossaryEntry[]`, `StatsConfig` (with the dynamic maps),
   `Country[]`, `SeasonRules[]`, `DraftYear[]`.
2. `standings` types first, because `teams` depends on `StandingsEntry`:
   `LeagueStandings` (`{ wildCardIndicator, standingsDateTimeUtc?,
   standings: StandingsEntry[] }`, confirmed by inference), `StandingsEntry`
   and `StandingsSeason[]` (`standings.seasonStandingManifest`).
3. `teams` / `players`:
   - `Roster` (`forwards`/`defensemen`/`goalies: RosterPlayer[]`),
     `Franchise[]`, `Prospects`.
   - `withFranchiseIds(teams, franchises: readonly Pick<Franchise, 'id' |
     'fullName'>[])`, so the existing test literals that carry only `{ id,
     fullName }` (`test/teams.test.mts:48,56,64`) still compile.
   - `teams.teamRoster` and `players.playersByTeam` share `Roster`.
   - In `src/api/teams.mts` (not `standings.mts`), `toTeam(teamData:
     Partial<StandingsEntry>)` and the private `fetchStandingsData` become
     typed. `Partial` keeps the runtime `?? ''` fallbacks meaningful and keeps
     `toTeam({})` (`test/teams.test.mts:33`) and `toTeam({ teamName: { default:
     '...' } })` (lines 47, 55, 63) valid.
     `nestedDefault(key: string)` indexes `teamData[key]`, which won't compile
     against an interface with no index signature, so narrow `key` to
     `'teamName' | 'teamCommonName' | 'teamAbbrev'`.
   - `standings.leagueStandings` returns `LeagueStandings`.

### Phase 3: Schedule

`WeeklySchedule`, `ScheduleGame` (shared by `DailySchedule.games`),
`ClubScheduleGame[]` for the monthly and weekly club schedules,
`TeamSeasonSchedule`, `CalendarSchedule`, `PlayoffCarousel`,
`PlayoffSeriesSchedule`, `PlayoffBracket` and `OddsPartner`.

Game-state variance (FUT/LIVE/OFF) matters here. Score, period and outcome
fields will mostly come out optional, with "missing when" JSDoc.

`helpers.gameIdsBySeason` loses its `JsonObject[]` variable annotation
(`helpers.mts:37`; it is an annotation, not a cast).

### Phase 4: Stats

- `ClubStatsSeason[]`, `GameLogEntry[]`, and `PlayerLanding`. Split
  `PlayerLanding` into `SkaterLanding | GoalieLanding` through a registry if the
  inference shows that `featuredStats`, `careerTotals` and `seasonTotals`
  diverge.
- Stats-API row types: `TeamSummaryRow`, and one row interface per skater and
  goalie report type. Register them in `SkaterReportRows` and
  `GoalieReportRows`. Rows that change with aggregation get the
  season-specific fields as optional, with JSDoc
  `/** Absent when aggregate is true */`.
- Signatures:

  ```ts
  skaterStatsWithQueryContext<R extends keyof SkaterReportRows>(ctx, p: SkaterStatsWithQueryContextParams<R>)
    : Promise<StatsApiPage<SkaterReportRows[R]>>
  goalieStatsSummary<S extends keyof GoalieReportRows = 'summary'>(ctx, p: GoalieStatsSummaryParams<S>)
    : Promise<GoalieReportRows[S][]>
  ```

  The exported `SkaterStatsWithQueryContextParams` and `GoalieStatsSummaryParams`
  interfaces (`src/api/stats.mts:51-85`) become generic (`<R>` / `<S>`), so the
  exported param types are kept rather than replaced by inline literals. The
  body of `goalieStatsSummary` (`stats.mts:279`) destructures with a runtime
  default (`statsType = 'summary'`, `stats.mts:284`), which fails with TS2322
  when the type is `S`. Widen first, e.g.
  `const report: keyof GoalieReportRows = statsType ?? 'summary'`. No return
  cast is needed: `.json()` returns `any`, so `response.data ?? []` already
  fits `GoalieReportRows[S][]`. `skaterStatsWithQueryContext`
  (`stats.mts:244`) has no default on `reportType`, so it needs no widening
  there. `reportType` can be passed straight to `defaultSortForReport` (which
  takes a `string`), because `R extends keyof SkaterReportRows` is a union of
  string literals; no widening or cast is needed.

  `reportType` / `statsType` are now typed as `keyof ...Rows`. That replaces
  `string`, so typos fail at compile time, and augmenting the registry adds new
  report types.

  This breaks `test/stats.test.mts:167`, which passes `statsType:
  'unknownReport'` to `newClient().stats.goalieStatsSummary(...)` to check the
  fallback sort for unknown reports (TS2322 under `tsc -p test`). Update that
  test: keep the runtime assertion and put a `// @ts-expect-error` on the line
  directly above the `statsType` property (the error is reported there, not on
  the following `franchiseId: 6` line), which also proves typos are rejected.
- **Report-type lists stay in sync**: `SKATER_REPORT_TYPES =
  Object.keys(defaultSortingByReport)` (`src/api/query/sorting/sorting-options.mts:91`) already exists
  and drives CLI help (`commands.mts:579`); `goalieStatsSorts(report: string)`
  is in `src/api/query/sorting/goalie-sorts.mts:13`. Neither is testable as-is: `defaultSortingByReport`
  (`src/api/query/sorting/sorting-options.mts:12`) is unexported and annotated
  `Record<string, SortExpr[]>`, which widens its keys to `string`, so
  `SKATER_REPORT_TYPES` is `string[]`; and goalie reports have no key list at
  all, only a `switch (report)` over 8 cases. First make them typed sources:
  - Skater: declare the map `const defaultSortingByReport = { ... } satisfies
    Record<string, SortExpr[]>` (no `as const`: it would turn the inline array
    literals into `readonly` tuples that can't be assigned to the mutable
    `SortExpr[]`). `satisfies` keeps the literal key names and contextually
    types the `direction` literals. Export `type SkaterReportType = keyof typeof
    defaultSortingByReport`. Add `const sortingLookup: Record<string,
    SortExpr[]> = defaultSortingByReport;` for the string lookup in
    `defaultSortForReport` (lines 97-103), since indexing the narrowed object
    with a `string` fails under `strict` (TS7053).
  - Goalie: turn the switch in `src/api/query/sorting/goalie-sorts.mts` into an exported
    `goalieSortingByReport` record (also `satisfies Record<string,
    SortExpr[]>`, no `as const`) plus a `GoalieReportType` key type
    (`goalieStatsSorts` keeps its `string` parameter and looks up through a
    widened `Record<string, SortExpr[]>` alias).
  Then add type tests asserting both directions of assignability, e.g.
  `[keyof SkaterReportRows] extends [SkaterReportType]` and
  `[SkaterReportType] extends [keyof SkaterReportRows]`, and the same for
  `GoalieReportRows` / `GoalieReportType`, so the registries and the existing
  lists can't drift. Put these sync tests, and the client-binder type test
  below, in the `tsc -p test` program (e.g. inside `test/stats.test.mts`).
  **Never put them under `test/types/`**: that program augments
  `SkaterReportRows`, which would break the two-way assignability check.
- **Client binder fix** (Findings point 4): in `src/nhl-client.mts`, give
  `stats` the type `Omit<Bound<typeof statsApi>, 'skaterStatsWithQueryContext'
  | 'goalieStatsSummary'> & StatsGenericMethods`. `StatsGenericMethods` spells
  out the generic signatures without `ctx`. `bind()` returns `Bound<Module>`,
  whose methods return the union of all row types, which isn't assignable to the
  generic signatures. So the assignment needs an explicit `as` cast at
  `stats: bind(ctx, statsApi)` (`nhl-client.mts:55`). Because `as` only requires
  that one side be assignable to the other, it weakens the drift safeguard, so
  add type tests that:
  - `client.stats.skaterStatsWithQueryContext({ reportType: 'bios', ... })`
    resolves to the bios row.
  - a mismatched parameter shape (for example an unknown `reportType`, or a
    wrong param field type) fails, via `// @ts-expect-error`.
- `src/cli/commands.mts`: the CLI passes `reportType` / `statsType` from argv
  as a `string`. **Decided: keep passing unknown names through to the API.**
  No cast is needed at the CLI boundary: `run` receives `values: any`
  (`commands.mts:31`), which is assignable to `keyof ...Rows`. Unknown names
  reach the API as they do today, so report types the NHL adds later keep
  working from the CLI.
  - Add a CLI test that an unknown `reportType` still builds the
    `en/skater/<name>` URL and exits 0 against a mocked response.
  - Help text keeps listing the known report types (`SKATER_REPORT_TYPES`) as
    suggestions, not as an enforced list.

### Phase 5: Game center and edge (largest)

- `Boxscore`, `PlayByPlay` with `Play = PlayTypes[keyof PlayTypes]`, one
  interface per `typeDescKey` and its `*Details` interface, `GameLanding`,
  `DailyScores`, `ShiftChart` (`StatsApiPage<ShiftEntry>`, with
  `eventDetails?`), `RightRail` and `GameStory`.
- Edge: 23 top-level interfaces. Pull shared measurement shapes (value, rank,
  league average, percentile, and so on) into `src/types/edge.mts`. The
  `cat/edge/*` variants get their own interfaces unless inference shows they're
  identical to the non-cat versions.
- `getEdge` and `getWeb` become generic internal helpers:
  `getWeb<T>(ctx, resource): Promise<T>`. They're internal and never bound, so
  they don't run into the `Bound<>` problem.
- Update `examples/game-summary.mts` (lines 17-18, 22), which `pnpm
  typecheck:examples` (run by CI in `pr.yml`) would otherwise fail on. It
  filters with `(play: { typeDescKey: string }) => play.typeDescKey === 'goal'`;
  the annotated parameter means the callback isn't a type guard, so `goals`
  stays `Play[]` and `goal.details.scoringPlayerId` (line 22) errors, because
  some variants (`period-start`, `game-end`) have no `details` and only goal
  details have `scoringPlayerId`. Either drop the parameter annotation so TS
  5.5+ infers the guard from the discriminant check, or write an explicit guard
  `(play): play is GoalPlay => play.typeDescKey === 'goal'`. The matching text
  is not part of `llms-full.txt` (examples appear there only as links), so
  nothing needs regenerating for it.

### Phase 6: Helpers, drift check, docs

- `helpers`:
  - `allPlayers` returns `AllPlayersEntry[]`, defined as
    `interface AllPlayersEntry extends Omit<RosterPlayer, 'firstName' |
    'lastName'> { team: string; firstName: string; lastName: string }`.
  - `allPlayersSummaryStatistics` returns
    `PlayerSummaryStatistics[]` (`SkaterReportRows['summary'] &
    Partial<AllPlayersEntry>`, made an interface where TS allows it).
  - Update `test/helpers.test.mts`. It asserts `matched[0].position` (line 239),
    and its mocks (around line 224 and in `rosterData()`) use a `position`
    field. Neither a skater summary row nor a roster entry has `position`; the
    real field is `positionCode`, and with no index signature `.position` is
    TS2339. Change `position` to `positionCode` in the mocks and assertions
    (lines 56, 209, 224 and 239). The mocks need no other change:
    `rosterData()` is typed `Record<string, object>` and reaches the code
    through the mocked `get`, so response types never check it.
  - The `team.franchise_id as number` cast (`helpers.mts:111`) stays, or is
    replaced by an explicit skip of teams without `franchise_id`.
    `Team.franchise_id?: number` is unchanged and `filter.franchise(franchiseId:
    Id)` doesn't accept `undefined`, so the types can't remove it.
- **Drift check** (`pnpm probe:check`): refetches the matrix, re-infers, and
  diffs the result against `scripts/probe/shapes/*.json`. It prints new fields,
  removed fields and required→optional flips. It's manual only. Add a
  maintainer note in CONTRIBUTING.md to run it before each release.
- Remove `JsonObject` from the public API, or keep it only as an internal
  helper. The package isn't published, so this break is fine. Update
  `examples/paginate-stats.mts` and `docs/recipes/paginate-stats.md` to use the
  typed rows.
- Docs:
  - `docs/concepts.md`: rewrite the `JsonObject` paragraph into a "Response
    types" section covering where the types come from, the optional/nullable
    rules, open enums, and how to extend types (augmentation, registries, the
    cast escape hatch).
  - New `docs/recipes/extending-response-types.md`. Link it in the `llms.txt`
    "## Recipes" section and in the `README.md` recipe list (lines 15-18)
    **before** running `pnpm docs:llms`: `scripts/build-llms-full.mts` only
    bundles files linked in `llms.txt`, so an unlinked recipe is silently left
    out.
  - `docs/recipes/filter-skater-stats.md`: line 67 lists report types as plain
    strings, and line 85 says an unknown `reportType` gets a `500`. Say that
    SDK report names are type-checked and extendable by augmenting
    `SkaterReportRows` / `GoalieReportRows`; keep the `500` note, scoped to
    the CLI pass-through case.
  - `README.md` gets a short note with a link.
  - `AGENTS.md`: the layout block (line 45 lists "`utils.mts` Id, JsonObject,
    sleep") gains `src/types/` and drops `JsonObject` if it is removed; the
    endpoint description (lines 69-71, "returns parsed JSON (`JsonObject`,
    `JsonObject[]`, or a small typed shape like `Team`/`DailySchedule`)") is
    rewritten to say endpoints return the named interfaces from `src/types/`
    (plus `Team` / `DailySchedule`).
  - `skills/nhl-api-ts/SKILL.md` (line 43, "Responses are raw NHL JSON
    (`JsonObject`)"): describe the named response types and drop `JsonObject`.
    `llms.txt` lists SKILL.md in its required section, so it is copied into
    `llms-full.txt`.
  - `openapi.yaml`: add response schemas generated from the same shapes, if
    that's cheap. Otherwise leave it out and note it as a follow-up.
- Regenerate `api-report.md` (`pnpm api:report`) and `llms-full.txt`
  (`pnpm docs:llms`). Run `docs:llms` after `api:report`, because
  `api-report.md` is part of the bundle; it also picks up the edited recipe,
  `docs/concepts.md`, `README.md` and `SKILL.md`. Ask the user whether
  they want a changeset; don't add one unprompted.

## Verification for every phase

```bash
pnpm lint:check && pnpm typecheck && pnpm exec tsc -p test && pnpm test
pnpm typecheck:types
pnpm typecheck:examples && pnpm typecheck:scripts
```

- Existing tests keep their runtime assertions. Update the mock inputs and
  literals in `test/teams.test.mts`, `test/stats.test.mts` and
  `test/helpers.test.mts` to match the new types (Phases 2, 4 and 6). Responses
  still pass through, so runtime behavior doesn't change.
- **Fixture conformance (type level)**: for each endpoint, commit a small
  trimmed fixture under `test/fixtures/` (a few KB at most, real data cut down
  to one item per array or variant). Write each as a typed `.mts` module, for
  example `export const boxscoreFixture: Boxscore = { ... }`, not as JSON.
  Importing JSON would need `resolveJsonModule` (set in neither tsconfig) plus
  `with { type: 'json' }` under `NodeNext`, TypeScript widens JSON strings to
  `string` (so `typeDescKey: "goal"` can't be assigned to the literal
  discriminants of `Play`), and imported values skip excess-property checks.
  Contextual typing in an `.mts` module keeps literal discriminants and flags
  fields the types don't model. Fixtures don't need `as const`. This catches a
  type that no longer matches real data.
- The augmentation test from Phase 0 still passes (`pnpm typecheck:types`, which CI also runs).
- Before closing out the work, run `pnpm probe:check` with no diff.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Sampling bias: a field looks required but is missing in an untested variant | Use a wide tag matrix, flag low-count fields, and lean toward `?` on fields under game-state-dependent parents. Augmentation lets consumers patch gaps. |
| LIVE game samples depend on when the probe runs | Run `fetch` during a game window (it's in season on 2026-10-17). Without a live sample, fields that exist only in LIVE games stay optional with a JSDoc note. |
| Rate limiting during the probe | Requests are sequential with a delay and disk caching, and reruns resume where they stopped. |
| Type count bloats `api-report.md` | Expected and acceptable. The report is the public API record. |
| `Bound<>` override drifts from the real implementation | The type tests call through `createNHLClient()`. The `as` cast at the binder only checks one-way assignability, so the `@ts-expect-error` mismatched-parameter test (Phase 4) is what makes drift fail `tsc -p test`. |
| Consumers' augmentations break when we later add the same field with a different type | Document it: the field you add should match the payload. If our type changes, TS reports a conflicting-declaration error, which is the signal to drop the augmentation. |

## Inventory (methods to retype)

- **teams**: `teamRoster`, `franchises`
- **players**: `prospectsByTeam`, `playersByTeam`
- **standings**: `leagueStandings`, `seasonStandingManifest`
- **schedule**: `dailySchedule` (inner `games` and `oddsPartners`),
  `weeklySchedule`, `teamMonthlySchedule`, `teamWeeklySchedule`,
  `teamSeasonSchedule`, `calendarSchedule`, `playoffCarousel`,
  `playoffSeriesSchedule`, `playoffBracket`
- **gameCenter**: `boxscore`, `playByPlay`, `matchUp`, `dailyScores`,
  `shiftChartData`, `seasonSeriesMatchup`, `gameStory`
- **stats**: `gametypesPerSeasonDirectoryByTeam`, `playerCareerStats`,
  `playerGameLog`, `teamSummary`, `skaterStatsSummary`,
  `skaterStatsWithQueryContext` (18 report types), `goalieStatsSummary`
  (8 report types)
- **misc**: `glossary`, `config`, `countries`, `seasonSpecificRulesAndInfo`,
  `draftYearAndRounds`
- **edge**: all 23 methods
- **helpers**: `allPlayers`, `allPlayersSummaryStatistics` (SDK-built shapes,
  derived from the types above)

That is 59 public methods in total, plus internal helpers (`getWeb`, `getEdge`,
`getData`, `fetchStandingsData`, `toTeam`, `withFranchiseIds`).

## Decisions

- CLI `reportType` / `statsType`: unknown names are passed through to the API
  without validation or rejection, and without a cast because `values` is
  `any` (Phase 4). Decided 2026-10-17.
