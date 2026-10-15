# Functional refactor

Move the SDK from class-based modules to plain functions and data. The package
is unpublished, so every change below is a breaking change with no
deprecation shims.

## Goals

- Endpoint functions are standalone and tree-shakeable. They take their
  dependencies as an argument instead of reading `this`.
- The `client.teams.teams()` call shape still works, built by binding the
  functions. Destructuring (`const { teams } = client.teams`) works too.
- Query filters are plain data (a discriminated union), not a class hierarchy.
- Pure logic (parsing, URL building, error mapping, query building) is separate
  from I/O and can be tested without mocking `fetch`.
- Tests stop patching prototypes (`Teams.prototype`, `mock.method(helpers, 'sleep')`).

## Non-goals

- Error classes stay classes. Subclassing `Error` is idiomatic, and the CLI
  depends on `instanceof`.
- No `Result`/`Either` types. Endpoints keep returning promises and throwing.
- No response typing beyond what exists today (`JsonObject`, `Team`).
- No CLI behavior changes. `src/cli/run.mts` keeps its parsing and output.

## Target design

### Context

```ts
// src/context.mts
export type Get = (
  endpoint: Endpoint,
  resource: string,
  params?: QueryParams,
) => Promise<Response>;

export interface Context {
  get: Get;
  sleep: (seconds: number) => Promise<void>;
}
```

Every endpoint function takes `ctx: Context` as its first argument:

```ts
// src/api/teams.mts
export const teamRoster = async (
  ctx: Context,
  { teamAbbr, season }: { teamAbbr: string; season: Id },
): Promise<JsonObject> =>
  (await ctx.get(Endpoint.API_WEB_V1, `roster/${teamAbbr}/${season}`)).json();

export const teamsApi = { teams, teamRoster, franchises } as const;
```

Each module exports one `<name>Api` object listing its public endpoints. That
object is the single source of truth for binding and for the CLI parity test.
Private helpers (`getEdge`, `getWeb`, `getData`, `fetchStandingsData`) become
non-exported module functions.

### Client

```ts
// src/nhl-client.mts
type Bound<M> = {
  [K in keyof M]: M[K] extends (ctx: Context, ...args: infer A) => infer R
    ? (...args: A) => R
    : never;
};

const bind = <M extends Record<string, (ctx: Context, ...args: never[]) => unknown>>(
  ctx: Context,
  api: M,
): Bound<M> => /* Object.fromEntries over api, closing over ctx */;

export const createNHLClient = (options: ClientOptions = {}) => {
  const config = resolveConfig(options);
  const ctx: Context = { get: createGet(config), sleep };
  return {
    config,
    teams: bind(ctx, teamsApi),
    standings: bind(ctx, standingsApi),
    // ...
  } as const;
};

export type NHLClient = ReturnType<typeof createNHLClient>;
```

`ClientOptions` gains `fetch?: typeof fetch`, which is useful to consumers
(proxies, custom agents) and lets tests skip patching the global.

### Filters

```ts
// src/api/query/filters.mts
export type Filter =
  | { kind: 'season'; start: Id; end: Id }
  | { kind: 'position'; position: PositionTypes }
  | { kind: 'decision'; decision: Decision }
  | { kind: 'draft'; year: Id; round?: Id }
  | ...; // one variant per current *Query class

export const filter = {
  season: (start: Id, end: Id): Filter => ({ kind: 'season', start, end }),
  position: (position: PositionTypes): Filter => ({ kind: 'position', position }),
  // ...
};

export const toQuery = (f: Filter): string => { switch (f.kind) { ... } };
export const validateFilter = (f: Filter): string | undefined => { ... };
```

```ts
// src/api/query/builder.mts
export interface QueryContext {
  readonly query: string;
  readonly filters: readonly Filter[];
  readonly errors: readonly string[];
  readonly factQuery: string;
}

export const buildQuery = (filters: readonly Filter[], factQuery = 'gamesPlayed>=1'): QueryContext;
export const isValidQuery = (context: QueryContext): boolean => context.errors.length === 0;
```

## Phases

Phases are numbered by topic. Run them in the order given under
[Suggested order](#suggested-order): 1, 4, 2, 3, 5. Each phase leaves `pnpm typecheck`, `pnpm exec tsc -p test --noEmit`, `pnpm test` and `pnpm lint:check` green and
is its own commit. Until Phase 5, `NHLClient` stays a class that assembles the
modules (bound functions for converted modules, class instances for the rest).

### Phase 1: Config, HTTP, context

Files: `src/config.mts`, `src/http-client.mts`, new `src/context.mts`,
`src/nhl-client.mts`, `src/index.mts`, `test/nhl-client.test.mts`,
`test/fetch-mock.mts`.

1. Replace `ClientConfig` with `interface Config` and
   `resolveConfig(options): Readonly<Config>`. Delete the unused
   `apiWebBaseUrl`, `apiBaseUrl` and `apiWebApiVer` fields. Add `fetch` to
   `ClientOptions` and `Config`.
2. Split `HttpClient.handleResponse`:
   - `errorForStatus(status: number, message: string): NHLApiException`, which is pure.
   - `readErrorMessage(response, url): Promise<string>`, which does the JSON
     body sniffing.
3. Replace `class HttpClient` with `createGet(config): Get`. Keep the debug
   logging inside the closure. Keep `buildUrl` and `Endpoint` unchanged.
   Inside each request, call fetch through a local copy:
   `const doFetch = config.fetch ?? globalThis.fetch; await doFetch(url)`.
   Do not call `config.fetch(url)`, since calling it as a method of the config
   object throws "Illegal invocation" in browsers. Resolve `globalThis.fetch`
   when each request runs, not once when `createGet` is called, so `mockFetch`
   (`mock.method(globalThis, 'fetch')`) still intercepts requests and the other
   module tests can stay unchanged.
4. Add `src/context.mts` with `Get` and `Context`.
5. Tests: add unit tests for `errorForStatus` (table of status codes to
   error class and code). Rewrite the HttpClient tests in
   `test/nhl-client.test.mts` against `createGet`, passing a fake `fetch`
   through config instead of using `mockFetch`.

6. `src/nhl-client.mts`: replace `new ClientConfig(...)` and
   `new HttpClient(...)` with `resolveConfig(options)` and
   `const ctx: Context = { get: createGet(config), sleep }`. The class
   `NHLClient` keeps its shape (including exposing `config`) and passes `ctx`
   to the API classes. Remove the public `httpClient` field (lines 23 and 37);
   nothing outside `nhl-client.mts` uses it, and `ctx` replaces it.
7. `src/index.mts`: drop the `HttpClient` re-export, and re-export `Config`,
   `resolveConfig`, `createGet`, `Get` and `Context` in place of `ClientConfig`
   (the `export * from '#src/config.mjs'` line covers the config names).

Temporary bridge, removed in Phase 3: the 9 API modules import
`type HttpClient` from `#src/http-client.mjs`, so `http-client.mts` keeps
`export type HttpClient = Pick<Context, 'get'>`. The imports stay untouched
until each module is converted. No other API code changes yet.

### Phase 2: Simple API modules

Files: `src/api/standings.mts`, `schedule.mts`, `game-center.mts`,
`players.mts`, `misc.mts`, `edge.mts`, `stats.mts`, `src/api/helpers.mts`,
`src/nhl-client.mts`, `test/nhl-client.test.mts`, `test/cli.test.mts`,
`test/edge.test.mts`, `test/helpers.test.mts`, and their tests.

Also in this phase, in `src/nhl-client.mts`: add `bind` (and the `Bound` type)
as described under Client, and have the interim class `NHLClient` assign
`bind(ctx, standingsApi)`, `bind(ctx, scheduleApi)`, etc. for the converted
modules while still constructing `Teams` (and any other unconverted class).

For each module:

1. Convert every public method to an exported `const fn = async (ctx, params)`.
   Keep the JSDoc and update the `@example` to `client.<module>.<fn>(...)`.
2. Turn private methods (`getWeb`, `getData`, `getEdge`) into unexported
   module functions that take `ctx`.
3. Export `<module>Api = { ... } as const`.
4. In `stats.mts`, replace parameter reassignment
   (`if (!sortExpr) sortExpr = ...`) with `const` expressions.
   (`queryContext.query` and the moved `goalieStatsSorts` import already
   landed in Phase 4.)
5. `src/api/helpers.mts` is still a class in this phase but uses the `Schedule`
   and `Stats` classes (`new Schedule(this.client)`, `new Stats(this.client)`).
   Change it to call `teamSeasonSchedule(this.client, …)` and
   `skaterStatsWithQueryContext(this.client, …)`. Those functions take a full
   `Context`, and `Pick<Context, 'get'>` (the Phase 1 `HttpClient` alias) is
   not assignable to it, so in this phase change the `Helpers` field and
   constructor parameter (`helpers.mts:16` and `:18`) from `HttpClient` to
   `Context`, and replace the import on line 7
   (`import type { HttpClient } from '#src/http-client.mjs'`) with
   `import type { Context } from '#src/context.mjs'` so no unused import is
   left behind. The interim `NHLClient`
   already holds a full `ctx` to pass in, and `new Teams(ctx)` still works
   because `Context` is assignable to the alias.
6. Tests: other module tests already go through `newClient()` and `mockFetch`, so
   they are unchanged and URL assertions stay the same. Update the tests
   that depend on class shape or on the removed classes:
   - `edge.test.mts` (lines ~104-109): replace the
     `Object.getPrototypeOf(newClient().edge)` method listing with
     `Object.keys(newClient().edge)` and drop the `getEdge` exclusion.
   - `helpers.test.mts`: the `Schedule.prototype.teamSeasonSchedule` and
     `Stats.prototype.skaterStatsWithQueryContext` mocks (lines ~74, 112, 172,
     214) and the `Schedule`/`Stats` class imports must go in this phase. Replace
     them with a fake `get` routing on `resource` (the Phase 3 step 4 approach)
     for the schedule and stats calls, building
     `new Helpers({ get: fakeGet, sleep: async () => {} })`. Change the
     `type Helpers` import (line 6) to a value import so `new Helpers` compiles.
     The `mock.method(helpers, 'allPlayers', …)` mocks (lines ~154 and ~211)
     keep working in this phase because `Helpers` is still a class. The
     `Teams.prototype` and `mock.method(helpers, 'sleep')` mocks stay until
     Phase 3. The call-argument assertions on the removed mocks
     (lines ~121-123: `{ teamAbbr: 'TOR', season: '20242025' }`; lines
     ~197-207: `reportType`, `aggregate`, `queryContext.query`) can't carry
     over, since the fake `get` only sees `resource` and `params`. Rewrite
     them as assertions on the recorded `get` calls:
     - `resource === 'club-schedule-season/TOR/20242025'`
     - `resource === 'en/skater/summary'`
     - `params.isAggregate === true`
     - `params.cayenneExp === 'franchiseId=5 and seasonId >= 20242025 and seasonId <= 20242025'`
   - `nhl-client.test.mts`: replace `instanceof Standings` / `instanceof Schedule`
     (and the other converted modules) with checks that the key exists and holds
     functions.
   - `cli.test.mts`: for converted modules, list methods with
     `Object.keys(client[name])`, since `Object.getOwnPropertyNames(Object.getPrototypeOf(...))`
     on a plain object returns `Object.prototype` members. Keep the prototype
     introspection for modules still classes (`teams` and `helpers`, the latter
     excluding `sleep`) until Phase 3.

### Phase 3: Teams and helpers

Files: `src/api/teams.mts`, `src/api/helpers.mts`, `src/http-client.mts`,
`src/nhl-client.mts`, `test/teams.test.mts`, `test/helpers.test.mts`,
`test/nhl-client.test.mts`, `test/cli.test.mts`.

1. Teams:
   - `createTeam` becomes exported pure `toTeam(data: JsonObject): Team`.
   - `enrichTeamsWithFranchiseIds` becomes pure
     `withFranchiseIds(teams, franchises): Team[]`, returning new objects
     instead of assigning `team.franchise_id`. Add `franchise_id` only when an
     id is found and leave the key out otherwise (`test/teams.test.mts:125`
     asserts `'franchise_id' in teams[3] === false`), so do not write
     `{ ...team, franchise_id: findFranchiseId(...) }`, which would add the key
     with value `undefined`. `findFranchiseId` stays as is.
   - `teams(ctx, { date })` becomes fetch standings, fetch franchises, then
     `withFranchiseIds(standings.map(toTeam), franchises)`.
2. Helpers:
   - Call `teams(ctx)`, `teamSeasonSchedule(ctx, ...)`, `teamRoster(ctx, ...)`
     and `skaterStatsWithQueryContext(ctx, ...)` directly. No more `new Teams(this.client)`.
     `helpers.mts:45`, `:91` and `:135` assign the result to a local `const teams`,
     which would shadow the imported function and be read before it is
     declared (TS2448). Import it under another name
     (`import { teams as fetchTeams, teamRoster } from '#src/api/teams.mjs'`)
     and write `const teams = await fetchTeams(ctx)`.
   - Use `ctx.sleep` in place of the overridable `sleep` method.
   - Export `helpersApi = { gameIdsBySeason, allPlayers, allPlayersSummaryStatistics } as const`.
   - In `allPlayers`, stop mutating roster player objects. Build a new
     `{ ...player, team, firstName, lastName }` instead.
   - Keep the `buildQuery([filter.franchise(...), filter.season(...)])` call
     already introduced in Phase 4.
3. Interim client and bridge cleanup: `NHLClient` assigns `bind(ctx, teamsApi)`
   instead of `new Teams(...)` and `bind(ctx, helpersApi)` instead of
   `new Helpers(...)`. Delete the `HttpClient` type alias from
   `http-client.mts` (no module imports it any more). Update
   `nhl-client.test.mts` (`instanceof Teams`, line 26; `helpers` is only
   checked by the key loop) and
   `cli.test.mts` (use `Object.keys` for `teams` and `helpers`, dropping the
   `sleep` exclusion) in this phase.
4. Tests:
   - `toTeam` and `withFranchiseIds` get plain unit tests with no fetch. Import
     them directly from `#src/api/teams.mjs`, not `#src/index.mjs`, since
     Phase 5 turns the barrel's teams export into a namespace.
   - Rewrite `test/helpers.test.mts` to call the helper functions with a
     hand-built `Context`: a fake `get` that routes on `resource`
     (`standings/now`, `en/franchise`, `club-schedule-season/TOR/...`,
     `roster/TOR/...`, `en/skater/summary`) and a recording `sleep`. This
     replaces the remaining `Teams.prototype` mock,
     `mock.method(helpers, 'sleep')` and the two
     `mock.method(helpers, 'allPlayers', …)` mocks (`helpers.test.mts:154`
     and `:211`). Those last two no longer intercept anything once
     `allPlayersSummaryStatistics` calls the module's own `allPlayers(ctx, …)`
     directly. (The `Schedule`/`Stats` mocks and their `get`-call assertions
     were already replaced in Phase 2.) Keep the existing expected outputs and
     sleep-call assertions.
   - In the `allPlayersSummaryStatistics` tests, have the fake `get` also
     answer `roster/TOR/20242025` and `roster/MTL/20242025` with roster data,
     so `firstName: 'Auston'` still merges. Give the stat entry
     `position: 'C'` to the TOR player in the `roster/TOR/20242025` data (the
     roster fixture at `helpers.test.mts:35-58` has no `position` field). The
     stat entry already has `position: 'F'`, and the removed `allPlayers` mock
     was what supplied the colliding `'C'`, so without this the "stat fields
     win" assertion would pass without any field colliding.
   - Drop any now-unused imports (e.g. the `Helpers` class value import).

### Phase 4: Query filters and builder

Files: `src/api/query/**`, `src/api/stats.mts`, `src/api/helpers.mts`,
`src/index.mts`, `test/query/*.test.mts`, `test/stats.test.mts`,
`test/helpers.test.mts`, `src/cli/commands.mts`, `src/cli/run.mts`,
`README.md` (query examples, lines ~141-155).

The query-API edits to `stats.mts` and `helpers.mts` happen here, while those
modules are still classes: update the `QueryContext` import and
`queryContext.query` (renamed from `queryStr`), the moved `goalieStatsSorts`
and renamed `SortingOptions` method, and in `helpers.mts` replace
`QueryBuilder`/`FranchiseQuery`/`SeasonQuery` with
`buildQuery([filter.franchise(...), filter.season(...)])`.

1. Replace `filters/*.mts` (12 `*Query` classes plus `base.mts` and
   `goalie-sorts.mts`) with a single
   `src/api/query/filters.mts` holding the `Filter` union, the `filter`
   constructors, `toQuery` and `validateFilter`. Keep `PositionTypes`,
   `StatusQueryOptions` and `goalieStatsSorts` (move `goalieStatsSorts` next to
   `sorting-options.mts`, where it belongs). Port each class's `toQuery`
   output exactly, since the existing filter tests are the spec.
2. Narrow types where the class only validated at runtime, e.g.
   `type Decision = 'W' | 'L' | 'O'`. Keep the runtime check in
   `validateFilter`, because CLI input arrives as `string`. `validateFilter`
   must return the same message strings as today, since the CLI prints them as
   `invalid filters: …` (`commands.mts:300`): return
   `'Decision value must be one of [W, L, O]'` for invalid decisions (today
   thrown by `DecisionQuery.validate()`) and `undefined` for every other
   variant, since all other classes' `validate()` just returns `true`. The
   `` `Filter failed validation: ${String(filter)}` `` branch in `builder.mts`
   is unreachable today, so it needs no per-variant text and no `describeFilter`
   helper.
3. Rewrite `builder.mts`. `QueryBuilder`/`QueryContext` classes become
   `buildQuery` plus the `QueryContext` interface, and `queryStr` is renamed to `query`.
   - Drop the `instanceof QueryBase` skip: the input type is `readonly Filter[]`.
     Delete the "skips non-filter values" test.
   - Drop the `debug` option, since callers can log `context.errors`.
4. `InvalidQueryValueException` is no longer thrown anywhere. Delete it and
   `src/api/query/errors.mts`. Remove the import at `src/cli/run.mts:3` and
   the check at `:379`, and the re-export at `src/api/query/index.mts:2`.
5. `SortingOptions.getDefaultSortingForReport` becomes a plain exported
   `defaultSortForReport(report)`. Fix the `goalieStatsSorts` default branch
   (`[{} as SortExpr]`) to fall back to the summary sort, matching how
   `defaultSortForReport` already handles unknown skater reports
   (`sorting-options.mts:98-103`). No Python original exists in the repo, and
   the package is unreleased, so idiomatic TS wins.
6. `src/cli/commands.mts` `buildQueryContext`: switch to `filter.*`
   constructors, `buildQuery` and `isValidQuery`.
7. Tests: convert `test/query/filters.test.mts` and `builder.test.mts` to
   `toQuery(filter.x(...))`. Decision validation becomes
   `assert.equal(validateFilter(filter.decision('A' as Decision)), '...')`.
   In `filters.test.mts`, update line 146
   (`assert.deepEqual(goalieStatsSorts('unknown'), [{}])`) to expect the summary
   sort, `[{ property: 'wins', direction: 'DESC' }, { property: 'gamesPlayed', direction: 'ASC' }, { property: 'playerId', direction: 'ASC' }]`,
   and move lines 130-140 from
   `SortingOptions.getDefaultSortingForReport` to `defaultSortForReport`.
   Also update `test/stats.test.mts` (`QueryBuilder`, `FranchiseQuery`,
   `SeasonQuery` usage) and its line 174 (`assert.equal(query.sort, '[{}]')` in
   "goalieStatsSummary prefixes franchise even with a custom cayenneExp", which
   reaches the default branch via `statsType: 'unknownReport'`) to expect
   `'[{"property":"wins","direction":"DESC"},{"property":"gamesPlayed","direction":"ASC"},{"property":"playerId","direction":"ASC"}]'`, and `test/helpers.test.mts` (`queryContext.queryStr`
   assertions). In `builder.test.mts` (lines ~68-90), remove the
   `QueryBuilder({ debug: true })` `console.error` capture and its
   `errors.length === 1` assertion, keeping the `context.errors` and `query`
   assertions.

### Phase 5: Client, barrel, CLI, docs

Files: `src/nhl-client.mts`, `src/index.mts`, `src/cli/run.mts`,
`test/fetch-mock.mts`, `test/cli.test.mts`, `test/nhl-client.test.mts`,
`test/schedule.test.mts`, `README.md`.

1. `bind` already exists (Phase 2). Implement `createNHLClient` as above,
   replacing the interim `class NHLClient`, and export `type NHLClient`.
2. In `src/cli/run.mts`, change the `createClient` default to `createNHLClient`
   and change the value import at line 14 to
   `import { createNHLClient, type NHLClient } …` (`NHLClient` is still used as
   a type at line 21). Under `verbatimModuleSyntax: true`
   (`tsconfig.json:11`), a value import of a type-only export is a compile
   error. `CommandSpec.run(client, values)` needs no change.
3. Barrel (`src/index.mts`): re-export modules as namespaces to avoid name
   collisions between endpoint functions
   (`export * as teams from '#src/api/teams.mjs'`, etc.). Re-export
   `createNHLClient`, `type NHLClient`, `type Context`, `buildUrl`,
   `Endpoint`, the filter/query API and the errors. Namespace re-exports move
   each module's interfaces under the namespace, so also export the public
   types by name from the barrel: `export type { Team } from '#src/api/teams.mjs'`,
   `export type { TeamSummaryParams, SkaterStatsWithQueryContextParams, … } from '#src/api/stats.mjs'`,
   and likewise for the other modules' exported param/result types.
   `test/helpers.test.mts:9` (`type Team` from `#src/index.mjs`) then keeps
   working; update any other test imports of moved types or values to match
   (Phase 3's `toTeam`/`withFranchiseIds` tests already import from
   `#src/api/teams.mjs` directly, so they are unaffected).
   `normalizeDate` (`src/api/schedule.mts:17`) is a function, not a type, and
   `test/schedule.test.mts:3` imports it from `#src/index.mjs`, so also add
   `export { normalizeDate } from '#src/api/schedule.mjs'` to the barrel.
4. Tests:
   - `fetch-mock.mts`: `newClient = () => createNHLClient()`. Change the
     import at line 2 to `import { createNHLClient, type NHLClient }` (or drop
     the return-type annotation and import only `createNHLClient`).
   - Replace the remaining `new NHLClient(...)` calls with
     `createNHLClient(...)`, since `NHLClient` is now type-only:
     `cli.test.mts:25` and `:45`, `nhl-client.test.mts:25` and `:42`. Change
     the value import in `cli.test.mts:5` to
     `import { createNHLClient, type NHLClient }` (type-only for `NHLClient`),
     and fix `nhl-client.test.mts` imports the same way.
   - `nhl-client.test.mts`: the module-key checks were already updated in
     Phases 2 and 3; make sure none reference the removed class.
   - `cli.test.mts`: remove any leftover prototype introspection and its
     exclusion list (`getEdge`, `createTeam`, `sleep`, …); everything uses
     `Object.keys(client[name])` by now. The `<module>Api` objects make the
     private-method filter unnecessary.
5. Update the README and every JSDoc `@example` that uses `new NHLClient()`,
   `new QueryBuilder()` or `new *Query(...)`. Use
   `grep -rnE "new (NHLClient|QueryBuilder|QueryContext|HttpClient|ClientConfig|[A-Za-z]+Query)\(" src test README.md`
   to confirm nothing is left; expect no output. Other `new` calls (errors,
   `UsageError`, `URLSearchParams`, `Map`, `Response`) stay.
6. Add `"sideEffects": false` to `package.json`. Without it, bundlers have to
   assume importing any module may run code, which limits tree-shaking
   whichever export shape is chosen. First confirm that no module in `src/`
   (outside `cli.mts`) does work at import time.
7. Add a changeset (major) describing the API change.

## Suggested order

Phase 1, then 4, 2, 3, 5. Phase 4 (filters) has no dependency on the client
shape, so it can run before the API conversions. `stats.mts` and
`helpers.mts` are still touched twice: Phase 4 makes the query-API edits and
Phases 2 and 3 convert them to functions. The benefit of this order is that
the filter rewrite is isolated from the client rework, not fewer edits.

## Verification

After each phase:

```sh
pnpm typecheck && pnpm exec tsc -p test --noEmit && pnpm lint:check && pnpm test
```

`pnpm typecheck` only covers `src/**/*.mts`; `pnpm test` strips types without
checking them, so the `tsc -p test` step is what type-checks the tests.

After Phase 5, additionally:

- `grep -rn "class " src` should list only error classes and `UsageError`.
- `grep -rn "this\." src` should return nothing outside error constructors.
- `grep -rn "prototype" test` should return nothing.
- Run the CLI against the live API as a smoke test:
  `node --conditions=source src/cli.mts teams teams` and one stats command with
  filters (e.g. `stats skater-stats-with-query-context summary --season-start 20232024 --position C`).
  Compare the output to the same commands on `next` before the refactor.
- `pnpm build` and check that `dist/index.d.mts` exposes `createNHLClient`
  with fully inferred module types (hover `client.edge.skaterDetail`).

## Decisions

1. **`NHLClient` is a type only.** The factory is `createNHLClient`, and
   `export type NHLClient = ReturnType<typeof createNHLClient>`.
2. **Error subclasses stay** as they are (`ResourceNotFoundException`, etc.).
3. **Namespace re-exports** (`export * as teams from '#src/api/teams.mjs'`).
   These keep the current method names. They tree-shake as well as flat
   names when access is static (`teams.teamRoster(...)`).
