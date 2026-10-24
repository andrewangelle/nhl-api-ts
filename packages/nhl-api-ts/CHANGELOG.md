# nhl-api-ts

## 0.3.0

### Minor Changes

- [#8](https://github.com/andrewangelle/nhl-api-ts/pull/8) [`436ac17`](https://github.com/andrewangelle/nhl-api-ts/commit/436ac175b2afd491108622e31d35e1cb99b9cf52) Thanks [@andrewangelle](https://github.com/andrewangelle)! - Add 45 new endpoints, a new `draft` module and EDGE top-10 leaderboards
  
  Every new method is typed from live responses, has a matching CLI command and is listed in `openapi.yaml`.
  
  **New `draft` module** (`client.draft`)
  
  - `rankings({ [season], [category] })`: Central Scouting rankings. `category` is a `ProspectCategory` (NA/Intl skater, NA/Intl goalie).
  - `tracker()`: the live draft tracker.
  - `picks({ [season], [round] })`: picks for one round (1-7) or `'all'`.
  - Draft years use the 4-digit `YYYY` format (`2023`), not `YYYYYYYY`.
  
  **EDGE**
  
  - 13 top-10 leaderboards for skaters, goalies and teams, e.g. `skaterSpeedTop10`, `goalie5v5Top10` and `teamZoneTimeTop10`. Each one takes a required `sortBy` and optional `positions`, `strength` or `category` filters. The new `EdgePositions`, `EdgeStrengths` and `EdgeZones` constants list the allowed values.
  - `teamComparison({ teamId })` and `byTheNumbers({ [season], [gameType] })`, which return league highlights.
  
  **Game center**: `scoreboard`, `wscPlayByPlay`, `playReplay` (experimental) and `gameMeta`.
  
  **Schedule**: `playoffSeriesMeta({ year, series })`.
  
  **Stats**
  
  - `skaterStatsLeaders` and `goalieStatsLeaders`: current leaders grouped by category.
  - `clubStats({ teamAbbr })`: a team's skater and goalie stats.
  - `skaterLeaders` and `goalieLeaders`: the top 10 all-time or single-season records.
  - `skaterMilestones` and `goalieMilestones`: career milestones that active players are close to.
  
  **Teams**: `rosterSeasons`, `teamScoreboard`, `statsTeams` and `teamById`.
  
  **Players**: `playerSpotlight` and `playerSearch`. `playerSearch` matches part of a name and can also filter by team or position. The API returns at most 5 rows per request, so use `start` to page.
  
  **Misc**: `componentSeasons`, `games`, `ping`, `seasonIds`, `tvSchedule`, `meta`, `partnerGameOdds`, `location` and `postalLookup`. The last three are experimental.
  
  **Season and date are now optional** on `teamRoster`, `playersByTeam`, `teamSeasonSchedule`, `calendarSchedule` and `playerGameLog`. If you leave them out, you get the current season or date. Some endpoints don't accept `now` and need `current` instead, and the SDK sends the right one for each.
  
  **Type updates from a fresh API probe**
  
  - Several `unknown[]` fields on EDGE goalie types now have real types.
  - Play-by-play `summary` now has a type, including the live `iceSurface` data.
  - Penalty `drawnBy`/`drawnByPlayerId` are now optional. Misconducts, for example, have no player who drew the penalty.
  - Penalties now include `servedBy`/`servedByPlayerId` when someone other than the penalized player serves the penalty.
  - Code that reads `drawnBy` may need a null check.
  
  **Other**: an array value in query params now repeats the key once per element (`include=a&include=b`).

### Patch Changes

- [#6](https://github.com/andrewangelle/nhl-api-ts/pull/6) [`2e0d573`](https://github.com/andrewangelle/nhl-api-ts/commit/2e0d5734c3753747a8e392a0ebae2e450b70c18a) Thanks [@andrewangelle](https://github.com/andrewangelle)! - Retain generics in stats api with a bindFn impl

## 0.2.1

### Patch Changes

- [#4](https://github.com/andrewangelle/nhl-api-ts/pull/4) [`8be2bac`](https://github.com/andrewangelle/nhl-api-ts/commit/8be2bac592f8760fa5b64b982cb55f45d1da2c8f) Thanks [@andrewangelle](https://github.com/andrewangelle)! - add condensedGameFr field to DailyScoresGame type. Update fixtures, comments, and descriptions in openapi

## 0.2.0

### Minor Changes

- [#2](https://github.com/andrewangelle/nhl-api-ts/pull/2) [`e6d4e77`](https://github.com/andrewangelle/nhl-api-ts/commit/e6d4e77041d8ea1fe4101413352f57a7227d579b) Thanks [@andrewangelle](https://github.com/andrewangelle)! - Add types to api responses. Add utils and tests for probing and infering types from the live api

## 0.1.0

### Minor Changes

- Initial release
