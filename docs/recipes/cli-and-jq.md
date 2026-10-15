# Use the CLI with jq

Every SDK method is a CLI command. Output is JSON on stdout. Errors and
progress go to stderr, so you can pipe stdout safely.

```bash
npx nhl-api-ts --help
nhl-api-ts <module> <command> [required args...] [--options]
```

Name mapping: `client.gameCenter.playByPlay({ gameId })` becomes
`nhl-api-ts game-center play-by-play <game-id>`. Required params can be
positional, in the order the help lists them, or flags. Optional params are
always flags: `teamAbbr` becomes `--team-abbr`.

## Examples

```bash
# Team abbreviations
nhl-api-ts teams teams --compact | jq -r '.[].abbr'

# Map abbreviations to franchise ids (needed for stats filters)
nhl-api-ts teams teams --compact | jq -r '.[] | "\(.abbr)\t\(.franchise_id)"'

# Top 5 point scorers for one franchise (5 = Toronto) in 2023-24
nhl-api-ts stats skater-stats-summary 20232024 20232024 --franchise-id 5 --limit 5 --compact \
  | jq -r '.[] | "\(.skaterFullName)\t\(.points)"'

# Goals in a game, in order
nhl-api-ts game-center play-by-play 2023020280 --compact \
  | jq '[.plays[] | select(.typeDescKey == "goal") | {period: .periodDescriptor.number, time: .timeInPeriod}]'

# Conference standings
nhl-api-ts standings league-standings --date 2024-04-18 --compact \
  | jq -r '.standings[] | select(.conferenceAbbrev == "E") | "\(.teamAbbrev.default)\t\(.points)"'

# EDGE: max skating speed, playoffs
nhl-api-ts edge skater-skating-speed-detail 8478402 --season 20232024 --game-type 3

# Query builder via filter flags
nhl-api-ts stats skater-stats-with-query-context summary \
  --season-start 20232024 --position D --nationality FIN --limit 10
```

## Options that take structured values

| Type     | Example                                                        |
| -------- | -------------------------------------------------------------- |
| list     | `--excludes eventDetails,playerStats`                          |
| int list | `--game-types 2,3`                                             |
| JSON     | `--sort-expr '[{"property":"goals","direction":"DESC"}]'`      |
| boolean  | `--aggregate` / `--no-aggregate`, `--rookie` / `--no-rookie`   |

## Scripting

- Check the exit code: `0` ok, `1` API or network error, `2` usage error.
- `--compact` prints one line, which is faster to pipe.
- `--debug` logs every request URL to stderr.
- `--timeout 30` for slow reports.
- `nhl-api-ts ... | head` exits cleanly. EPIPE is handled.

```bash
if ! out=$(nhl-api-ts game-center boxscore "$id" --compact 2>err.log); then
  echo "failed: $(cat err.log)"; exit 1
fi
```
