---
"nhl-api-ts": minor
---

Add 45 new endpoints, a new `draft` module and EDGE top-10 leaderboards

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
