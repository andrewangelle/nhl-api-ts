# Plan: cover the endpoints in NHL-API-Reference that the SDK doesn't call yet

Source of truth for "missing": `NHL-API-Reference/README.md` (a sibling of the repo
root, i.e. `<repo-root>/../NHL-API-Reference/README.md`) compared against the
paths actually requested in `packages/nhl-api-ts/src/api/*.mts` (not `openapi.yaml`).

All paths below are relative to `packages/nhl-api-ts/` unless noted (the reference
path above is relative to the repo root). Follow
"Adding or changing an endpoint" in `AGENTS.md` for every method; this plan only
says *what* to add and *where*, plus the decisions that aren't obvious.

## Goals

- Every useful endpoint in the reference has a typed SDK method, a CLI command,
  a URL test, an `openapi.yaml` path, and a README entry.
- Response types come from live responses via `api-types-infer`, same as today.
- Prefer additive changes (existing methods gaining optional params), but the
  package is unreleased, so don't contort an API to avoid a breaking change.

## Non-goals / deliberately skipped

| Endpoint | Why |
| --- | --- |
| `GET /model/v1/openapi.json` | Phase 0: still 404. Skip. |
| `GET /v1/where-to-watch` | Phase 0: 404 with and without `?include=…`, and on `/now` and `/US`. Skip. |
| `GET /v1/ppt-replay/goal/{gameId}/{event}` | Phase 0: 307 to `ppt-replay/{gameId}/{event}`, same payload. `playReplay` covers it. Skip. |
| `GET /stats/rest/en/skater` | Phase 0: 404. Skip `skaterInfo`. |
| `GET /stats/rest/en/game/meta` | Phase 0: 404. Skip `gameMetadata`. |
| `GET /stats/rest/en/content/module/{key}` | Phase 0: 200 but `{"data":[],"total":0}` for every key tried. Skip `contentModule`. |
| `GET /stats/rest/ping` | Health check, returns `{}` (200). Add only if cheap (see Phase 6); otherwise skip. |

## Cross-cutting decisions

1. **"now" defaults.** Optional date/season params default to the literal `now`
   segment (AGENTS.md convention). Two exceptions the API dictates:
   `roster/{team}/current` and `skater-stats-leaders/current` /
   `goalie-stats-leaders/current` use `current`, not `now`.
2. **Season + gameType pairs.** When `season` is omitted, ignore `gameType` and
   hit `.../now` (or `.../current`), exactly like `edgeResource` in
   `src/api/edge.mts`. `gameType` defaults to `2`.
3. **Unknown enum values.** Many Edge top-10 `sort-by` / `category` values are
   "unknown" in the reference. Type them as `OpenUnion<...>` with only the values
   confirmed in Phase 0, so callers can still pass anything.
4. **Module placement.** Prefer existing modules; add one new module (`draft`),
   since draft has 5 related endpoints. Adding a module means wiring it in
   `src/nhl-client.mts`, a `ModuleSpec` in `src/cli/commands.mts`, a
   `test/draft.test.mts`, a `src/types/draft.mts` exported from
   `src/types/index.mts`, and a README section. Also:
   - add `export * as draft from '#src/api/draft.mjs';` to `src/index.mts` (every
     module is re-exported as a namespace there), plus a named
     `export type { … } from '#src/api/draft.mjs'` for the public param types and
     `ProspectCategory`, as edge and stats do. Nothing fails if this is missed;
   - add `'draft'` to the hard-coded `sdkModules` list in `test/cli.test.mts`
     (it must equal the `MODULES` names, or the CLI test fails);
   - add `'draft'` to the separate module list in `test/nhl-client.test.mts`;
   - add `draft: 'draft'` to `fileOf` in `packages/api-types-infer/src/fixtures.mts`
     (unknown modules otherwise land in `test/fixtures/misc.mts`);
   - add a `draft` entry to the top-level `tags:` list in `openapi.yaml`.
5. **Naming collisions.** The web API and stats API both have "leaders" and
   "season" endpoints. Names below keep them distinct (`skaterStatsLeaders`
   = web, `skaterLeaders` = stats API; `seasonIds` = web `/v1/season`, while the
   existing `misc.seasonSpecificRulesAndInfo` stays on `stats/rest/en/season`).
6. **Changesets.** Don't add changesets as part of this work; the maintainer
   will ask for one when wanted.

## Phase 0: discovery (local only, needs network)

Before writing code:

1. `curl` every endpoint in Phases 1–6 once and record the HTTP status. Drop any
   that don't return 200. Note the redirect target for `now`/`current` variants.
2. For the Edge top-10 endpoints, find the valid `sort-by` and `category` values.
   The nhl.com EDGE pages call these URLs; read the values from the browser
   network tab, or probe candidates (`total`, `avg`, `per60`, `max`, `shots`,
   `goals`, `pctg`, `high`, `mid`, `long`, `all`, ...) and keep the ones that 200.
3. Confirm the `categories` values for `skater-stats-leaders` /
   `goalie-stats-leaders` (e.g. `goals`, `assists`, `points`, `wins`,
   `savePctg`, `goalsAgainstAverage`, `shutouts`), and the valid `attribute`
   values for stats-API `leaders/skaters/{attribute}` / `leaders/goalies/{attribute}`.
4. Write the findings into this file (an "Enum values" appendix) so the typed
   unions and CLI `choices` are grounded in real responses.

**Status: done (2026-10-24).** Results are in the "Phase 0 findings" appendix at
the end of this file. The phase tables below are already updated with them:
dropped endpoints moved to "Non-goals", Edge path orders and position values
corrected.

## Phase 1: player and team web endpoints

| Method | Module | URL | Notes |
| --- | --- | --- | --- |
| `playerGameLog({ playerId, [seasonId], [gameType] })` | stats | `player/{id}/game-log/now` | Make `seasonId`/`gameType` optional. No season → `now`. Not breaking. |
| `skaterStatsLeaders({ [season], [gameType], [categories], [limit] })` | stats | `skater-stats-leaders/{season}/{gameType}` or `/current` | `categories` is `string[]`, joined with `,`. `limit: -1` = all; document it. |
| `goalieStatsLeaders({ [season], [gameType], [categories], [limit] })` | stats | `goalie-stats-leaders/{season}/{gameType}` or `/current` | Same shape as skaters. |
| `clubStats({ teamAbbr, [season], [gameType] })` | stats | `club-stats/{team}/{season}/{gameType}` or `/now` | Sits beside `gametypesPerSeasonDirectoryByTeam` (`club-stats-season`). |
| `teamSeasonSchedule({ teamAbbr, [season] })` | schedule | `club-schedule-season/{team}/now` | Make `season` optional (currently required in `schedule.mts`); no season → `now`. Same treatment as `teamRoster`. |
| `calendarSchedule({ [date] })` | schedule | `schedule-calendar/{date}` or `/now` | Make `date` optional (currently required in `schedule.mts`); no date → `schedule-calendar/now`. Not breaking. |
| `playerSpotlight()` | players | `player-spotlight` | |
| `teamRoster({ teamAbbr, [season] })` | teams | `roster/{team}/current` | Make `season` optional. Also update `playersByTeam` in `players.mts` the same way so the two stay consistent. |
| `rosterSeasons({ teamAbbr })` | teams | `roster-season/{team}` | |
| `teamScoreboard({ teamAbbr })` | teams | `scoreboard/{team}/now` | |

Tests: one URL case per variant (`now`/`current` and explicit season or date) in
`test/stats.test.mts`, `test/players.test.mts`, `test/teams.test.mts`,
`test/schedule.test.mts` (including both `calendarSchedule` variants). Assert
`categories`/`limit` with `queryOf(url)`.

**Status: done (2026-10-24).** Leader `categories` are typed with
`SkaterLeaderCategory` / `GoalieLeaderCategory` (wrapped in `OpenUnion`), and the
response's category keys are optional since `categories` filters them out.

## Phase 2: game and league web endpoints

| Method | Module | URL | Notes |
| --- | --- | --- | --- |
| `scoreboard({ [date] })` | gameCenter | `scoreboard/{date}` or `/now` | Phase 0: `scoreboard/2026-10-20` also returns 200, so take an optional `date`. |
| `wscPlayByPlay({ gameId })` | gameCenter | `wsc/play-by-play/{gameId}` | Phase 0: a **bare array** of plays, not a `PlayByPlay` object, and the play shape differs (`id`, `period`, `secondsRemaining`, `utc`; no `periodDescriptor`/`timeRemaining`). Infer a new `WscPlay` type; don't reuse `Play`. |
| `playReplay({ gameId, eventNumber })` | gameCenter | `ppt-replay/{gameId}/{eventNumber}` | Sample needs a real `eventNumber`; derive it from a play-by-play sample in `samples.mts`. Phase 0: works for any event (a shot returns the game header only; a goal adds a `goal` object), so `goal` is optional. Replaces `goalReplay` (see Non-goals). |
| `gameMeta({ gameId })` | gameCenter | `meta/game/{gameId}` | |
| `tvSchedule({ [date] })` | misc | `network/tv-schedule/{date}` or `/now` | |
| `partnerGameOdds({ countryCode })` | misc | `partner-game/{countryCode}/now` | |
| `seasonIds()` | misc | `season` | Returns `number[]`. |
| `meta({ [players], [teams] })` | misc | `meta?players=…&teams=…` | List params joined with `,`. Omit empty params from the query. Phase 0: bare `meta` is 200 (empty `players`/`teams`); `seasonStates=true` changed nothing, so drop that param. |
| `playoffSeriesMeta({ year, series })` | schedule | `meta/playoff-series/{year}/{letter}` | Next to the other playoff methods; param is named `series` to match `playoffSeriesSchedule({ season, series })`. That neighbour doesn't validate, so don't validate here either (or add the same one-letter `RangeError` check to both). Phase 0: the letter is case-insensitive (`a` and `A` return the same thing). |
| `location()` | misc | `location` | Geo-IP; answer depends on caller. Mention in JSDoc. |
| `postalLookup({ postalCode })` | misc | `postal-lookup/{postalCode}` | |

## Phase 3: draft module (new)

Create `src/api/draft.mts` exporting `draftApi`, wire `draft: bindModule(ctx, draftApi)`.

| Method | URL | Notes |
| --- | --- | --- |
| `rankings({ [season], [category] })` | `draft/rankings/{season}/{category}` or `/now` | `season` is **YYYY**, not YYYYYYYY. `category`: 1 NA skater, 2 Intl skater, 3 NA goalie, 4 Intl goalie. Export a `ProspectCategory` const + type. `RangeError` outside 1–4. When `season` is given and `category` is omitted, `category` defaults to `1` (the API has no season-only route); with no `season`, `category` is ignored and the URL is `/now`. |
| `tracker()` | `draft-tracker/picks/now` | |
| `picks({ [season], [round] })` | `draft/picks/{season}/{round}` or `/now` | `round`: `1`–`7` or `'all'` (default `'all'` when `season` given). Phase 0: `draft/picks/now` redirects to round **1**, not `all`; document that `picks()` and `picks({ season })` return different rounds. `round: 8` is a 404, so `RangeError` outside 1–7. |

Tests (`test/draft.test.mts`): a URL case per variant, including
`rankings({ season: 2023 })` → `draft/rankings/2023/1`, `rankings()` → `/now`, and
the `RangeError` for an out-of-range `category`.

Leave `misc.draftYearAndRounds` (stats `en/draft`) where it is; cross-link it
from the `draft` README section.

## Phase 4: NHL Edge leaderboards and team comparison

### Shared helper

Generalize `edgeResource` in `src/api/edge.mts` so the id slot can be a list of
path segments:

```ts
// "<path>/<seg>/<seg>/now" or "<path>/<seg>/<seg>/<season>/<gameType>"
function edgeResource(path: string, segments: Id[], params: EdgeSeasonParams): string
```

Keep `getEdge(ctx, path, id, params)` working for the existing callers (wrap `id`
into `[id]` / `[]`) so the detail methods don't change.

### Shared param types

Export from `src/api/edge.mts`:

Phase 0: the shot-location top-10s 404 on `F`/`D` and only accept
`forwards`/`defense`. Every other top-10 accepts both forms with identical
responses, so use the long form everywhere (it's also what the nhl.com EDGE
frontend sends for shot locations):

```ts
export const EdgePositions = { ALL: 'all', FORWARDS: 'forwards', DEFENSE: 'defense' } as const;
export const EdgeStrengths = { ALL: 'all', EVEN: 'es', POWER_PLAY: 'pp', PENALTY_KILL: 'pk' } as const;
export const EdgeZones = { OFFENSIVE: 'offensive', NEUTRAL: 'neutral', DEFENSIVE: 'defensive' } as const;
```

In `src/index.mts`, the existing `export type { EdgePlayerParams, EdgeSeasonParams,
EdgeTeamParams }` block can't carry values. Add a separate value export,
`export { EdgePositions, EdgeStrengths, EdgeZones } from '#src/api/edge.mjs';`, and
put the matching type aliases (e.g. `EdgePosition`, `EdgeStrength`, `EdgeZone`) in
the `export type` block.

Each top-10 method gets its own `sortBy` / `category` `OpenUnion` from Phase 0,
except `teamZoneTimeTop10` and `skaterZoneTimeTop10`: their `sortBy` is the zone
(`offensive` / `neutral` / `defensive`, e.g. `es/offensive/20242025/2` and
`F/all/offensive`), so type it with the `EdgeZones` values.

### Methods

| Method | URL path (before `/{season}/{gameType}` or `/now`) |
| --- | --- |
| `teamComparison({ teamId })` | `edge/team-comparison/{teamId}` |
| `teamSkatingDistanceTop10({ positions, strength, sortBy })` | `edge/team-skating-distance-top-10/{positions}/{strength}/{sortBy}` |
| `teamSkatingSpeedTop10({ positions, sortBy })` | `edge/team-skating-speed-top-10/{positions}/{sortBy}` |
| `teamZoneTimeTop10({ strength, sortBy })` | `edge/team-zone-time-top-10/{strength}/{sortBy}` |
| `teamShotSpeedTop10({ positions, sortBy })` | `edge/team-shot-speed-top-10/{positions}/{sortBy}` |
| `teamShotLocationTop10({ positions, sortBy, category })` | `edge/team-shot-location-top-10/{positions}/{sortBy}/{category}` |
| `skaterDistanceTop10({ positions, strength, sortBy })` | `edge/skater-distance-top-10/{positions}/{strength}/{sortBy}` |
| `skaterSpeedTop10({ positions, sortBy })` | `edge/skater-speed-top-10/{positions}/{sortBy}` |
| `skaterZoneTimeTop10({ positions, strength, sortBy })` | `edge/skater-zone-time-top-10/{positions}/{strength}/{sortBy}` |
| `skaterShotSpeedTop10({ positions, sortBy })` | `edge/skater-shot-speed-top-10/{positions}/{sortBy}` |
| `skaterShotLocationTop10({ positions, sortBy, category })` | `edge/skater-shot-location-top-10/{positions}/{sortBy}/{category}` |
| `goalie5v5Top10({ sortBy })` | `edge/goalie-5v5-top-10/{sortBy}` |
| `goalieShotLocationTop10({ sortBy, category })` | `edge/goalie-shot-location-top-10/{sortBy}/{category}` |
| `byTheNumbers({ [season], [gameType] })` | `edge/by-the-numbers` (Phase 0: `/now` and `/{season}/{gameType}` are 200, bare path 404) |
| `goalieSavePercentageTop10({ sortBy })` | `edge/goalie-edge-save-pctg-top-10/{sortBy}` |

Notes:

- The reference's team-skating-distance path has a typo (`{season}{game-type}`
  with no slash). Phase 0 confirmed: the slash form is 200, the no-slash form 404.
- **The reference has the shot-location order wrong.** The API takes `sortBy`
  *before* `category` (Phase 0: the reference order 404s for every value; the
  table above uses the working order, which matches the nhl.com frontend).
- Every top-10 returns a **bare array** of 10 rows. A row is the entity
  (`player` or `team`) plus every metric for that leaderboard, whatever `sortBy`
  is (`sortBy` only reorders). So rows differ per method, but the entity objects
  are shared: factor out `EdgeLeaderPlayer` (`firstName`, `lastName`, `slug`,
  `headshot`, `position`, `sweaterNumber`, `team`; `id` only on some
  endpoints, so optional) and `EdgeLeaderTeam` (`abbrev`, `commonName`,
  `placeNameWithPreposition`, `slug`, `teamLogo`; `id` optional) and reuse
  them in per-method row interfaces.
- Positional params need sensible defaults (`positions: 'all'`,
  `strength: 'all'`, shot-location `category: 'all'`) so `sortBy` is the only
  required field where the API allows it.
- All `sortBy`/`category` values are now known (appendix). Type them as closed
  unions from the appendix wrapped in `OpenUnion`, and give the CLI `choices`
  for every `sortBy` and `category`, not just the zone-time ones.
- README: add a "Leaderboards (top 10)" bullet to the `edge` section.
- CLI: use `choices` for `positions`, `strength`, and `sortBy` on the two
  zone-time methods (zones); leave `sortBy` free text for the other methods.
- CLI builder: `edgeCommand` (`src/cli/commands.mts`) only supports
  `idKind: 'player' | 'team' | 'none'` and always adds `[...idArg, ...edgeSeasonArgs]`.
  Extend it with an extra `args: ArgSpec[]` parameter (positions, strength,
  sortBy, category) placed before the season args, or add a sibling builder for
  leaderboards. Existing Edge commands must keep working unchanged.

## Phase 5: stats API (`api.nhle.com/stats/rest`)

Unwrap `response.data ?? []`. Base URL depends on the module: new `misc` methods
reuse `getData` (`Endpoint.API_CORE` with the `stats/rest/en/...` prefix) so misc
keeps one base-URL style; new `teams` / `stats` / `players` methods use
`Endpoint.API_STATS` with `en/...`, like `teams.franchises` and `stats.mts`.

| Method | Module | URL | Notes |
| --- | --- | --- | --- |
| `playerSearch({ cayenneExp, [sort], [dir], [start], [include], [exclude] })` | players | `en/players` | Phase 0: **`cayenneExp` is required** (without it the response is `{"data":[],"total":0}`). The server returns **at most 5 rows** per request whatever `limit` is (`limit=-1`, `50`, `100` all give 5; smaller limits work). Page with `start` and read `total`. So drop `limit` (or allow only 1–5) and document the paging. `include`/`exclude` work and can repeat. Consider accepting a `QueryContext` (reading `queryContext.query`) the way `skaterStatsWithQueryContext` does. |
| `skaterLeaders({ attribute, [cayenneExp] })` | stats | `en/leaders/skaters/{attribute}` | Phase 0: these are **all-time single-season records** (top 10; e.g. Gretzky's 215 points), and `cayenneExp=season=…` narrows to one season. Unknown attributes give **500**, not 404. Valid attributes are in the appendix. |
| `goalieLeaders({ attribute, [cayenneExp] })` | stats | `en/leaders/goalies/{attribute}` | Same as skaters. |
| `skaterMilestones()` | stats | `en/milestones/skaters` | |
| `goalieMilestones()` | stats | `en/milestones/goalies` | |
| `statsTeams()` | teams | `en/team` | The existing `teams()` builds `Team` from standings. Keep this as a raw passthrough with its own type. |
| `teamById({ teamId })` | teams | `en/team/id/{teamId}` | Phase 0: unknown id is a 404 with a JSON `{ message }` body. Return the single row (`data[0]`), not the array. |
| `componentSeasons()` | misc | `en/componentSeason` | |
| `games({ cayenneExp })` | misc | `en/game` | Phase 0: unfiltered is 18.9 MB (every game ever). Make `cayenneExp` **required**; one season (`season=20252026`) is about 390 KB, 1,551 rows. |

Consider whether `teamSummary` should take a `reportType` like
`skaterStatsWithQueryContext`. The reference documents `/{lang}/team/{report}`,
but the SDK only calls `team/summary`. That's a larger change; leave it as a
follow-up issue instead of part of this plan.

## Phase 6: optional

- `ping()` in misc → `stats/rest/ping`, health check. The HTTP client throws an `NHLApiException` subclass on any
  non-ok response, so `ping()` resolves `true` on success and failures throw
  (document this in JSDoc). It never returns `false`.
- ~~`openApiSpec()` / `edge.byTheNumbers()` only if Phase 0 shows they work.~~
  Phase 0: `openApiSpec` still 404s (skipped); `byTheNumbers` works and moved
  into Phase 4.

## Per-endpoint checklist (repeat for every method)

1. `src/api/<module>.mts`: method with JSDoc (`@param params.x`, `@example` URL). Add to the module's `*Api` object.
2. `src/types/<module>.mts`: response interfaces, using the AGENTS.md type rules. Export from `src/types/index.mts`.
3. `packages/api-types-infer/src/samples.mts`: sample calls covering the variants (`now` vs explicit season, regular vs playoffs, each enum value worth seeing). Add `src/specs.mts` entries for unwrapped/grouped endpoints.
4. Locally: `pnpm api-types:fetch && pnpm api-types:infer`. Compare the draft to the hand-written types, then `pnpm api-types:fixtures` and `pnpm openapi:schemas`.
5. `src/cli/commands.mts`: `CommandSpec`. The CLI test fails without it.
6. `test/<module>.test.mts`: exact-URL test for each variant.
7. `openapi.yaml`: path + `x-sdk-method` + named response.
8. `README.md` API modules list; `skills/nhl-api-ts/SKILL.md` if usage guidance changes; `docs/concepts.md` for the `current` vs `now` note and the YYYY draft season.
9. `pnpm api:report && pnpm docs:llms`.
10. Full check: `pnpm lint:check && pnpm typecheck && pnpm typecheck:test && pnpm typecheck:examples && pnpm typecheck:types && pnpm typecheck:scripts && pnpm test`.

## Suggested PR breakdown

1. Phase 0 findings (this file only).
2. Phase 1: player/team (≈10 methods).
3. Phase 2: game/league (≈13 methods).
4. Phase 3: draft module (3 methods + module wiring).
5. Phase 4: Edge leaderboards (14 methods + helper refactor).
6. Phase 5: stats API (≈12 methods).
7. Phase 6: optional extras.

## Risks

- **Undocumented / unstable endpoints.** Several (`ppt-replay`, `partner-game`,
  `postal-lookup`, `location`) feed nhl.com widgets and may change or disappear.
  Mark them `@experimental` in JSDoc so api-extractor surfaces it, and keep them
  in the `api-types:check` matrix so drift is caught before release.
- **Geo-dependent responses.** `location`, `where-to-watch`, `partner-game` vary
  by caller IP. Fixtures come from the maintainer's location; types must allow
  for other regions (optional fields where unsure).
- **Large payloads.** `en/game`, `en/skater`, `en/players?limit=-1`. Pick
  defaults that don't download the whole history by accident.
- **Reference bugs.** The reference's CAT goalie example URL points at
  `skater-detail`; the SDK's `cat/edge/goalie-detail` is right. Don't "fix" the
  SDK to match the reference.

## Appendix: Phase 0 findings (probed 2026-10-24)

Probed with `curl` from the US (`location` → `{"country":"US"}`) during the
2026-27 regular season. Sample ids: game `2026020160` (VGK @ STL, final; goal
event `193`, shot event `67`), player `8478402`, team `TOR` / `10`.
"307 → X" means the `now`/`current` form redirects to X.

### Status by endpoint

Web API (`api-web.nhle.com/v1`):

| Path | Status | Notes |
| --- | --- | --- |
| `player/{id}/game-log/now` | 307 → `.../20262027/2` | |
| `skater-stats-leaders/current` | 307 → `.../20262027/2` | `.../now` is **404** |
| `skater-stats-leaders/{season}/{gameType}` | 200 | `gameType=3` works too |
| `goalie-stats-leaders/current` | 307 → `.../20262027/2` | |
| `club-stats/{team}/now` | 307 → `.../20262027/2` | an empty playoff season returns `skaters: []`, `goalies: []` |
| `club-schedule-season/{team}/now` | 307 → `.../20262027` | |
| `schedule-calendar/now` | 307 → `schedule-calendar/2026-10-24` | |
| `player-spotlight` | 200 | bare array (10) |
| `roster/{team}/current` | 307 → `roster/TOR/20262027` | `roster/{team}/now` is **404** |
| `roster-season/{team}` | 200 | bare `number[]` of seasons |
| `scoreboard/{team}/now` | 200 | no redirect; unknown team 404 |
| `scoreboard/now` | 200 | `scoreboard/{date}` also 200 |
| `wsc/play-by-play/{gameId}` | 200 | bare array of plays (different shape from `PlayByPlay.plays`) |
| `wsc/game-story/{gameId}` | 200 | already in the SDK (`gameCenter.gameStory`); not in scope |
| `ppt-replay/{gameId}/{event}` | 200 | `goal` key only when the event is a goal |
| `ppt-replay/goal/{gameId}/{event}` | 307 → `ppt-replay/{gameId}/{event}` | skipped |
| `meta/game/{gameId}` | 200 | `{ teams, seasonStates, gameState }` |
| `where-to-watch` | **404** | skipped |
| `network/tv-schedule/now` | 307 → `.../2026-10-24` | |
| `partner-game/{cc}/now` | 200 | no redirect. `us`, `CA`, even `XX` return 200; `partner-game/US/{date}` 404 |
| `season` | 200 | bare `number[]` (109 seasons, `19171918`…`20262027`) |
| `meta?players=…&teams=…` | 200 | bare `meta` is 200 too |
| `meta/playoff-series/{year}/{letter}` | 200 | letter is case-insensitive |
| `location` | 200 | `{"country":"US"}` |
| `postal-lookup/{code}` | 200 | bare array; `90210` → 2 rows (ANA, LAK), Canadian `M5V3L9` → `[]` |
| `model/v1/openapi.json` | **404** | skipped |
| `draft/rankings/now` | 200 | no redirect (current year, category 1) |
| `draft/rankings/{YYYY}/{1-4}` | 200 | `/5`, `/0`, season-only `/{YYYY}`, and 8-digit seasons are 404 |
| `draft-tracker/picks/now` | 307 → `draft-tracker/picks/2026` | |
| `draft/picks/now` | 307 → `draft/picks/2026/1` | round **1**, not `all` |
| `draft/picks/{YYYY}/{1-7,all}` | 200 | `/8` and season-only are 404 |
| `edge/team-comparison/{teamId}/now` | 307 | explicit season and `gameType=3` are 200 |
| `edge/*-top-10/.../now` (all 13) | 307 | explicit `20252026/2` and `20242025/3` are 200 |
| `edge/by-the-numbers/now` | 200 | `{season}/{gameType}` is 200 (smaller payload: no `games`/`gameDate`); bare path and `{date}` are 404 |

Stats API (`api.nhle.com/stats/rest`):

| Path | Status | Notes |
| --- | --- | --- |
| `en/players` | 200 | empty unless `cayenneExp` is given; max 5 rows per request; page with `start` |
| `en/leaders/skaters/{attr}` | 200 / **500** | 500 for unknown attributes |
| `en/leaders/goalies/{attr}` | 200 / **500** | same |
| `en/milestones/skaters` | 200 | 281 rows |
| `en/milestones/goalies` | 200 | 40 rows |
| `en/skater` | **404** | skipped |
| `en/team` | 200 | 62 rows |
| `en/team/id/{id}` | 200 | 1 row; unknown id → 404 `{ "message": … }` |
| `en/componentSeason` | 200 | 1 row: `{ id: "stats", component: "stats", gameTypeId: 2, seasonId: 20262027 }` |
| `en/game` | 200 | 18.9 MB unfiltered; `cayenneExp=season=20252026` → 1,551 rows / 390 KB |
| `en/game/meta` | **404** | skipped |
| `en/content/module/{key}` | 200, empty | `overview`, `skaters`, `goalies`, `teams`, `leaders`, `draft`, `home`, `stats` all return `{"data":[],"total":0}`. Skipped |
| `ping` | 200 | body `{}` |

### Enum values

**Web stats leaders** (`?categories=`; comma-separated; unknown category → **400**;
no `categories` → every category, 5 rows each; default `limit` is 5;
`limit=-1` returns all, e.g. 747 rows for skater goals):

- `skater-stats-leaders`: `goals`, `assists`, `points`, `plusMinus`,
  `penaltyMins`, `goalsPp`, `goalsSh`, `faceoffLeaders`, `toi`.
  (400: `shots`, `shootingPctg`, `gamesPlayed`, `hits`.)
- `goalie-stats-leaders`: `wins`, `shutouts`, `savePctg`, `goalsAgainstAverage`.
  (400: `losses`, `gamesPlayed`.)

The response is an object keyed by category, each a row array
(`id`, `firstName`, `lastName`, `sweaterNumber`, `headshot`, `teamAbbrev`,
`teamName`, `teamLogo`, `position`, `value`).

**Stats API leaders** (`leaders/{skaters|goalies}/{attribute}`, case-sensitive):

- skaters: `points`, `goals`, `assists`, `gamesPlayed`
- goalies: `gaa`, `savePctg`, `shutouts`, `timeOnIce`, `gamesPlayed`
- 500 for everything else tried: `wins` (goalies!), `plusMinus`,
  `penaltyMinutes`, `ppGoals`, `shGoals`, `shots`, `savePercentage`,
  `goalsAgainstAverage`, `losses`, `saves`, ...

**Draft**: rankings `category` `1`–`4`; picks `round` `1`–`7` or `all`.

**Edge top-10.** Values come from the enums in the nhl.com EDGE frontend
(`wsr.nhle.com/static/js/main.bundle.js` and its chunks), and every value was
confirmed 200 against `20252026/2`:

| Param | Values | Used by |
| --- | --- | --- |
| `positions` | `all`, `forwards`, `defense` (`F`/`D` work everywhere **except** shot location) | all skater/team top-10s with a position slot |
| `strength` | `all`, `es`, `pp`, `pk` | skating distance, zone time |
| zone `sortBy` | `offensive`, `neutral`, `defensive` | team/skater zone time |
| distance `sortBy` | `total`, `per-60`, `max-game`, `max-period` | team/skater skating distance |
| skating speed `sortBy` | `max`, `over-22`, `20-22`, `18-20` | team/skater skating speed |
| shot speed `sortBy` | `max`, `over-100`, `90-99`, `80-89`, `70-79` | team/skater shot speed |
| shot location `sortBy` | `sog`, `goals`, `shooting-pctg` | team/skater shot location |
| shot location `category` | `all`, `high`, `mid`, `long` | team/skater/goalie shot location |
| goalie shot location `sortBy` | `save-pctg`, `saves`, `goals-against`, `shots-against` | goalie shot location |
| goalie 5v5 `sortBy` | `save-pctg`, `save-pctg-close`, `shots`, `shots-per-60` | goalie 5v5 |
| goalie save % `sortBy` | `games`, `pctg` | goalie EDGE save % |

Confirmed path orders (before `/{season}/{gameType}` or `/now`):

```
team-skating-distance-top-10/{positions}/{strength}/{sortBy}
team-skating-speed-top-10/{positions}/{sortBy}
team-zone-time-top-10/{strength}/{zone}
team-shot-speed-top-10/{positions}/{sortBy}
team-shot-location-top-10/{positions}/{sortBy}/{category}     # reference says category/sortBy: wrong
skater-distance-top-10/{positions}/{strength}/{sortBy}
skater-speed-top-10/{positions}/{sortBy}
skater-zone-time-top-10/{positions}/{strength}/{zone}
skater-shot-speed-top-10/{positions}/{sortBy}
skater-shot-location-top-10/{positions}/{sortBy}/{category}   # reference says category/sortBy: wrong
goalie-5v5-top-10/{sortBy}
goalie-shot-location-top-10/{sortBy}/{category}               # reference says category/sortBy: wrong
goalie-edge-save-pctg-top-10/{sortBy}
```

Row metrics per leaderboard (the same for every `sortBy`):

| Endpoint | Entity | Metrics |
| --- | --- | --- |
| skating distance | `player` / `team` | `distanceTotal`, `distancePer60`, `distanceMaxPerGame`, `distanceMaxPerPeriod` |
| skater speed | `player` | `maxSpeed`, `burstsOver22`, `bursts20To22`, `bursts18To20` |
| team skating speed | `team` | `maxSkatingSpeed`, `burstsOver22`, `bursts20To22`, `bursts18To20` |
| zone time | `player` / `team` | `offensiveZoneTime`, `neutralZoneTime`, `defensiveZoneTime` |
| shot speed | `player` / `team` | `hardestShot`, `shotAttemptsOver100`, `shotAttempts90To100`, `shotAttempts80To90`, `shotAttempts70To80` |
| shot location (all three) | `player` / `team` | `all`, `highDanger`, `midRange`, `longRange` |
| goalie 5v5 | `player` | `savePctg`, `savePctgClose`, `shots`, `shotsPer60` |
| goalie save % | `player` | `gamesOver900`, `pctgGamesOver900` |

Note the skater (`maxSpeed`) / team (`maxSkatingSpeed`) naming difference.
Value shapes: speed and distance metrics are `{ imperial, metric }`, and the
"max" ones (`maxSpeed`, `maxSkatingSpeed`, `hardestShot`, `distanceMaxPerGame`,
`distanceMaxPerPeriod`) add an `overlay` game context (`player`, `gameDate`,
`awayTeam`, `homeTeam`, `gameOutcome`, `periodDescriptor`, `gameType`, plus
`timeInPeriod` on the speed overlay only). Zone times are fractions
(`0.4957…`), shot-location and burst counts are integers, and goalie metrics are
plain numbers. Factor the `{ imperial, metric, overlay? }` shape into one shared
interface if inference agrees.
