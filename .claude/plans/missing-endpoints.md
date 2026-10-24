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
| `GET /model/v1/openapi.json` | Reference says it 404s. Re-check in Phase 0; skip unless it returns 200. |
| `GET /v1/edge/by-the-numbers` | Reference marks it "Unknown". Probe in Phase 0; add only if it returns a stable payload. |
| `GET /stats/rest/ping` | Health check with no data. Add only if cheap (see Phase 6); otherwise skip. |

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

## Phase 2: game and league web endpoints

| Method | Module | URL | Notes |
| --- | --- | --- | --- |
| `scoreboard()` | gameCenter | `scoreboard/now` | |
| `wscPlayByPlay({ gameId })` | gameCenter | `wsc/play-by-play/{gameId}` | Probably reuses play-by-play types; compare the sample against `PlayByPlay` (what `playByPlay` returns) first, falling back to just the `PlayTypes`/`Play` event types if only the plays array matches, before inferring a new type. |
| `goalReplay({ gameId, eventNumber })` | gameCenter | `ppt-replay/goal/{gameId}/{eventNumber}` | |
| `playReplay({ gameId, eventNumber })` | gameCenter | `ppt-replay/{gameId}/{eventNumber}` | Sample needs a real `eventNumber`; derive it from a play-by-play sample in `samples.mts`. |
| `gameMeta({ gameId })` | gameCenter | `meta/game/{gameId}` | |
| `whereToWatch({ [include] })` | misc | `where-to-watch` | |
| `tvSchedule({ [date] })` | misc | `network/tv-schedule/{date}` or `/now` | |
| `partnerGameOdds({ countryCode })` | misc | `partner-game/{countryCode}/now` | |
| `seasonIds()` | misc | `season` | Returns `number[]`. |
| `meta({ [players], [teams], [seasonStates] })` | misc | `meta?players=…&teams=…` | List params joined with `,`. Omit empty params from the query. |
| `playoffSeriesMeta({ year, series })` | schedule | `meta/playoff-series/{year}/{letter}` | Next to the other playoff methods; param is named `series` to match `playoffSeriesSchedule({ season, series })`. That neighbour doesn't validate, so don't validate here either (or add the same one-letter `RangeError` check to both). |
| `location()` | misc | `location` | Geo-IP; answer depends on caller. Mention in JSDoc. |
| `postalLookup({ postalCode })` | misc | `postal-lookup/{postalCode}` | |

## Phase 3: draft module (new)

Create `src/api/draft.mts` exporting `draftApi`, wire `draft: bindModule(ctx, draftApi)`.

| Method | URL | Notes |
| --- | --- | --- |
| `rankings({ [season], [category] })` | `draft/rankings/{season}/{category}` or `/now` | `season` is **YYYY**, not YYYYYYYY. `category`: 1 NA skater, 2 Intl skater, 3 NA goalie, 4 Intl goalie. Export a `ProspectCategory` const + type. `RangeError` outside 1–4. When `season` is given and `category` is omitted, `category` defaults to `1` (the API has no season-only route); with no `season`, `category` is ignored and the URL is `/now`. |
| `tracker()` | `draft-tracker/picks/now` | |
| `picks({ [season], [round] })` | `draft/picks/{season}/{round}` or `/now` | `round`: `1`–`7` or `'all'` (default `'all'` when `season` given). |

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

```ts
export const EdgePositions = { ALL: 'all', FORWARDS: 'F', DEFENSE: 'D' } as const;
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
| `teamShotLocationTop10({ positions, category, sortBy })` | `edge/team-shot-location-top-10/{positions}/{category}/{sortBy}` |
| `skaterDistanceTop10({ positions, strength, sortBy })` | `edge/skater-distance-top-10/{positions}/{strength}/{sortBy}` |
| `skaterSpeedTop10({ positions, sortBy })` | `edge/skater-speed-top-10/{positions}/{sortBy}` |
| `skaterZoneTimeTop10({ positions, strength, sortBy })` | `edge/skater-zone-time-top-10/{positions}/{strength}/{sortBy}` |
| `skaterShotSpeedTop10({ positions, sortBy })` | `edge/skater-shot-speed-top-10/{positions}/{sortBy}` |
| `skaterShotLocationTop10({ positions, category, sortBy })` | `edge/skater-shot-location-top-10/{positions}/{category}/{sortBy}` |
| `goalie5v5Top10({ sortBy })` | `edge/goalie-5v5-top-10/{sortBy}` |
| `goalieShotLocationTop10({ category, sortBy })` | `edge/goalie-shot-location-top-10/{category}/{sortBy}` |
| `goalieSavePercentageTop10({ sortBy })` | `edge/goalie-edge-save-pctg-top-10/{sortBy}` |

Notes:

- The reference's team-skating-distance path has a typo (`{season}{game-type}`
  with no slash). Use the slash form and confirm it in Phase 0.
- The leaderboards probably share a row shape per entity. If inference produces
  near-identical types, factor out `EdgeSkaterLeaderRow` / `EdgeTeamLeaderRow` /
  `EdgeGoalieLeaderRow` interfaces and reuse them.
- Positional params need sensible defaults (`positions: 'all'`,
  `strength: 'all'`) so `sortBy` is the only required field where the API allows it.
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
| `playerSearch({ [cayenneExp], [sort], [dir], [start], [limit], [include], [exclude] })` | players | `en/players` | Reference says results are capped at 5 without `limit`; document it. Consider accepting a `QueryContext` (reading `queryContext.query`) the way `skaterStatsWithQueryContext` does. |
| `skaterLeaders({ attribute })` | stats | `en/leaders/skaters/{attribute}` | |
| `goalieLeaders({ attribute })` | stats | `en/leaders/goalies/{attribute}` | |
| `skaterMilestones()` | stats | `en/milestones/skaters` | |
| `goalieMilestones()` | stats | `en/milestones/goalies` | |
| `skaterInfo()` | stats | `en/skater` | Bare endpoint, no report. Check in Phase 0 whether it's useful; may be a huge list. |
| `statsTeams()` | teams | `en/team` | The existing `teams()` builds `Team` from standings. Keep this as a raw passthrough with its own type. |
| `teamById({ teamId })` | teams | `en/team/id/{teamId}` | |
| `componentSeasons()` | misc | `en/componentSeason` | |
| `games({ [cayenneExp] })` | misc | `en/game` | Unfiltered, this is every game ever. Default `cayenneExp` to the current season or make it required; decide in Phase 0 by response size. |
| `gameMetadata()` | misc | `en/game/meta` | |
| `contentModule({ templateKey })` | misc | `en/content/module/{templateKey}` | Find the valid keys (e.g. `overview`) in Phase 0. |

Consider whether `teamSummary` should take a `reportType` like
`skaterStatsWithQueryContext`. The reference documents `/{lang}/team/{report}`,
but the SDK only calls `team/summary`. That's a larger change; leave it as a
follow-up issue instead of part of this plan.

## Phase 6: optional

- `ping()` in misc → `stats/rest/ping`, health check. The HTTP client throws an `NHLApiException` subclass on any
  non-ok response, so `ping()` resolves `true` on success and failures throw
  (document this in JSDoc). It never returns `false`.
- `openApiSpec()` / `edge.byTheNumbers()` only if Phase 0 shows they work.

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
