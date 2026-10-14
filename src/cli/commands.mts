import { QueryBuilder } from '#src/api/query/builder.mjs';
import { DecisionQuery } from '#src/api/query/filters/decision.mjs';
import { DraftQuery } from '#src/api/query/filters/draft.mjs';
import { ExperienceQuery } from '#src/api/query/filters/experience.mjs';
import { FranchiseQuery } from '#src/api/query/filters/franchise.mjs';
import { GameTypeQuery } from '#src/api/query/filters/game-type.mjs';
import { HomeRoadQuery } from '#src/api/query/filters/home-road.mjs';
import { NationalityQuery } from '#src/api/query/filters/nationality.mjs';
import { OpponentQuery } from '#src/api/query/filters/opponent.mjs';
import {
  PositionQuery,
  type PositionTypes,
} from '#src/api/query/filters/position.mjs';
import { SeasonQuery } from '#src/api/query/filters/season.mjs';
import { ShootCatchesQuery } from '#src/api/query/filters/shoot-catch.mjs';
import { StatusQuery } from '#src/api/query/filters/status.mjs';
import { SKATER_REPORT_TYPES } from '#src/api/query/sorting/sorting-options.mjs';
import type { NHLClient } from '#src/nhl-client.mjs';

export type ArgType =
  | 'string'
  | 'int'
  | 'number'
  | 'boolean'
  | 'list'
  | 'int-list'
  | 'json';

export interface ArgSpec {
  /** SDK parameter name (camelCase). The CLI flag is its kebab-case form. */
  name: string;
  type: ArgType;
  description: string;
  required?: boolean;
  /** Shown in help only; the SDK applies its own defaults. */
  default?: string;
  choices?: readonly string[];
}

export interface CommandSpec {
  name: string;
  description: string;
  args: ArgSpec[];
  // biome-ignore lint/suspicious/noExplicitAny: values are validated by the parser against `args`
  run: (client: NHLClient, values: any) => Promise<unknown>;
}

export interface ModuleSpec {
  name: string;
  description: string;
  commands: CommandSpec[];
}

/** Thrown for invalid command-line input (exit code 2). */
export class UsageError extends Error {}

// ---- Reusable argument specs ------------------------------------------------

const req = (spec: ArgSpec): ArgSpec => ({ ...spec, required: true });

const teamAbbr: ArgSpec = req({
  name: 'teamAbbr',
  type: 'string',
  description: 'Team abbreviation, e.g. BUF, TOR',
});
const season: ArgSpec = {
  name: 'season',
  type: 'string',
  description: 'Season in YYYYYYYY format, e.g. 20232024',
};
const gameId: ArgSpec = req({
  name: 'gameId',
  type: 'string',
  description: 'Game id, e.g. 2023020280',
});
const playerId: ArgSpec = req({
  name: 'playerId',
  type: 'string',
  description: 'NHL player id, e.g. 8478402',
});
const date = (description = 'Date in YYYY-MM-DD format'): ArgSpec => ({
  name: 'date',
  type: 'string',
  description,
});
const gameTypeId: ArgSpec = {
  name: 'gameTypeId',
  type: 'int',
  description: '1=Preseason, 2=Regular season, 3=Playoffs',
  default: '2',
};
const sortExpr: ArgSpec = {
  name: 'sortExpr',
  type: 'json',
  description:
    'Sort as JSON, e.g. \'[{"property":"points","direction":"DESC"}]\'',
};
const start: ArgSpec = {
  name: 'start',
  type: 'int',
  description: 'Pagination offset',
  default: '0',
};
const limit = (def: string): ArgSpec => ({
  name: 'limit',
  type: 'int',
  description: 'Max results',
  default: def,
});
const factCayenneExp = (def?: string): ArgSpec => ({
  name: 'factCayenneExp',
  type: 'string',
  description: 'Base fact filter expression',
  default: def,
});
const defaultCayenneExp: ArgSpec = {
  name: 'defaultCayenneExp',
  type: 'string',
  description: 'Overrides the generated cayenneExp filter entirely',
};
const apiSleepRate = (def: string): ArgSpec => ({
  name: 'apiSleepRate',
  type: 'number',
  description: 'Seconds to sleep between per-team requests',
  default: def,
});

// ---- Edge -------------------------------------------------------------------

const edgeSeasonArgs: ArgSpec[] = [
  { ...season, description: `${season.description}. Defaults to current` },
  {
    name: 'gameType',
    type: 'int',
    description: '2=Regular season, 3=Playoffs (only used with --season)',
    default: '2',
  },
];

type EdgeMethod = keyof NHLClient['edge'] & string;

const edgeCommand = (
  name: string,
  method: EdgeMethod,
  idKind: 'player' | 'team' | 'none',
  description: string,
): CommandSpec => {
  const idArg: ArgSpec[] =
    idKind === 'player'
      ? [playerId]
      : idKind === 'team'
        ? [
            req({
              name: 'teamId',
              type: 'string',
              description: 'NHL team id, e.g. 10',
            }),
          ]
        : [];
  return {
    name,
    description,
    args: [...idArg, ...edgeSeasonArgs],
    // biome-ignore lint/suspicious/noExplicitAny: dispatch by method name
    run: (c, v) => (c.edge[method] as any).call(c.edge, v),
  };
};

// ---- Stats query-context filters --------------------------------------------

const queryFilterArgs: ArgSpec[] = [
  {
    name: 'seasonStart',
    type: 'string',
    description: 'Filter: first season, e.g. 20232024',
  },
  {
    name: 'seasonEnd',
    type: 'string',
    description: 'Filter: last season (defaults to --season-start)',
  },
  { name: 'franchiseId', type: 'string', description: 'Filter: franchise id' },
  {
    name: 'gameType',
    type: 'string',
    description: 'Filter: 1=Preseason, 2=Regular, 3=Playoffs',
  },
  {
    name: 'position',
    type: 'string',
    description: 'Filter: F=all forwards, C, L, R, D',
    choices: ['F', 'C', 'L', 'R', 'D'],
  },
  {
    name: 'nationality',
    type: 'string',
    description: 'Filter: nationality code, e.g. CAN, USA, SWE',
  },
  {
    name: 'decision',
    type: 'string',
    description: 'Filter: goalie decision',
    choices: ['W', 'L', 'O'],
  },
  {
    name: 'draftYear',
    type: 'string',
    description: 'Filter: draft year, e.g. 2020',
  },
  {
    name: 'draftRound',
    type: 'string',
    description: 'Filter: draft round (requires --draft-year)',
  },
  {
    name: 'rookie',
    type: 'boolean',
    description: 'Filter: rookies only (--no-rookie for veterans)',
  },
  {
    name: 'homeRoad',
    type: 'string',
    description: 'Filter: home or road games',
    choices: ['H', 'R'],
  },
  {
    name: 'opponentFranchiseId',
    type: 'string',
    description: 'Filter: opponent franchise id',
  },
  {
    name: 'shootCatch',
    type: 'string',
    description: 'Filter: shoots/catches',
    choices: ['L', 'R'],
  },
  {
    name: 'active',
    type: 'boolean',
    description: 'Filter: active players only',
  },
  {
    name: 'hallOfFame',
    type: 'boolean',
    description: 'Filter: Hall of Fame players only',
  },
];

// biome-ignore lint/suspicious/noExplicitAny: parsed CLI values
function buildQueryContext(v: Record<string, any>) {
  const filters = [];
  if (v.gameType !== undefined) {
    filters.push(new GameTypeQuery(v.gameType));
  }
  if (v.seasonStart !== undefined || v.seasonEnd !== undefined) {
    const first = v.seasonStart ?? v.seasonEnd;
    filters.push(new SeasonQuery(first, v.seasonEnd ?? first));
  }
  if (v.franchiseId !== undefined) {
    filters.push(new FranchiseQuery(v.franchiseId));
  }
  if (v.position !== undefined) {
    filters.push(new PositionQuery(v.position as PositionTypes));
  }
  if (v.nationality !== undefined) {
    filters.push(new NationalityQuery(v.nationality));
  }
  if (v.decision !== undefined) {
    filters.push(new DecisionQuery(v.decision));
  }
  if (v.draftYear !== undefined) {
    filters.push(new DraftQuery(v.draftYear, v.draftRound));
  } else if (v.draftRound !== undefined) {
    throw new UsageError('--draft-round requires --draft-year');
  }
  if (v.rookie !== undefined) {
    filters.push(new ExperienceQuery(v.rookie));
  }
  if (v.homeRoad !== undefined) {
    filters.push(new HomeRoadQuery(v.homeRoad));
  }
  if (v.opponentFranchiseId !== undefined) {
    filters.push(new OpponentQuery(v.opponentFranchiseId));
  }
  if (v.shootCatch !== undefined) {
    filters.push(new ShootCatchesQuery(v.shootCatch));
  }
  if (v.active || v.hallOfFame) {
    filters.push(
      new StatusQuery({ isActive: v.active, isHallOfFame: v.hallOfFame }),
    );
  }

  const context = new QueryBuilder().build(filters);
  if (!context.isValid()) {
    throw new UsageError(`invalid filters: ${context.errors.join('; ')}`);
  }
  return context;
}

// ---- Registry ---------------------------------------------------------------

export const MODULES: ModuleSpec[] = [
  {
    name: 'teams',
    description: 'Teams, rosters and franchises',
    commands: [
      {
        name: 'teams',
        description:
          'List all NHL teams with conference, division and franchise info',
        args: [date('Standings date in YYYY-MM-DD format. Defaults to now')],
        run: (c, v) => c.teams.teams(v),
      },
      {
        name: 'team-roster',
        description: 'Roster for a team and season',
        args: [teamAbbr, req(season)],
        run: (c, v) => c.teams.teamRoster(v),
      },
      {
        name: 'franchises',
        description: 'All past and current NHL franchises',
        args: [],
        run: (c) => c.teams.franchises(),
      },
    ],
  },
  {
    name: 'standings',
    description: 'League standings',
    commands: [
      {
        name: 'league-standings',
        description:
          'Standings for a date, or at the end of a season (--season wins)',
        args: [date('Date in YYYY-MM-DD format. Defaults to now'), season],
        run: (c, v) => c.standings.leagueStandings(v),
      },
      {
        name: 'season-standing-manifest',
        description: 'Metadata (dates, rules in use) for every NHL season',
        args: [],
        run: (c) => c.standings.seasonStandingManifest(),
      },
    ],
  },
  {
    name: 'schedule',
    description: 'League, team and playoff schedules',
    commands: [
      {
        name: 'daily-schedule',
        description: 'Games on a single date',
        args: [date('Date in YYYY-MM-DD format. Defaults to today')],
        run: (c, v) => c.schedule.dailySchedule(v),
      },
      {
        name: 'weekly-schedule',
        description: 'Games for the week starting at a date',
        args: [date('Date in YYYY-MM-DD format. Defaults to now')],
        run: (c, v) => c.schedule.weeklySchedule(v),
      },
      {
        name: 'team-monthly-schedule',
        description: "A team's games for a month",
        args: [
          teamAbbr,
          {
            name: 'month',
            type: 'string',
            description: 'Month in YYYY-MM format. Defaults to now',
          },
        ],
        run: (c, v) => c.schedule.teamMonthlySchedule(v),
      },
      {
        name: 'team-weekly-schedule',
        description: "A team's games for a week",
        args: [teamAbbr, date('Date in YYYY-MM-DD format. Defaults to now')],
        run: (c, v) => c.schedule.teamWeeklySchedule(v),
      },
      {
        name: 'team-season-schedule',
        description: "A team's full season schedule",
        args: [teamAbbr, req(season)],
        run: (c, v) => c.schedule.teamSeasonSchedule(v),
      },
      {
        name: 'calendar-schedule',
        description: 'Schedule in calendar format for a date',
        args: [req(date())],
        run: (c, v) => c.schedule.calendarSchedule(v),
      },
      {
        name: 'playoff-carousel',
        description: 'All playoff series up to the current round',
        args: [req(season)],
        run: (c, v) => c.schedule.playoffCarousel(v),
      },
      {
        name: 'playoff-series-schedule',
        description: 'Schedule and results for one playoff series',
        args: [
          req(season),
          req({
            name: 'series',
            type: 'string',
            description: 'Series letter: a-h first round ... o final',
          }),
        ],
        run: (c, v) => c.schedule.playoffSeriesSchedule(v),
      },
      {
        name: 'playoff-bracket',
        description: 'Full playoff bracket for a year',
        args: [
          req({ name: 'year', type: 'string', description: 'Year, e.g. 2024' }),
        ],
        run: (c, v) => c.schedule.playoffBracket(v),
      },
    ],
  },
  {
    name: 'game-center',
    description: 'Game-level data: boxscores, play-by-play, shifts',
    commands: [
      {
        name: 'boxscore',
        description: 'Full boxscore for a game',
        args: [gameId],
        run: (c, v) => c.gameCenter.boxscore(v),
      },
      {
        name: 'play-by-play',
        description: 'Every recorded event in a game',
        args: [gameId],
        run: (c, v) => c.gameCenter.playByPlay(v),
      },
      {
        name: 'match-up',
        description: 'Landing-page game summary',
        args: [gameId],
        run: (c, v) => c.gameCenter.matchUp(v),
      },
      {
        name: 'daily-scores',
        description: 'Scores for all games on a date',
        args: [date('Date in YYYY-MM-DD format. Defaults to now')],
        run: (c, v) => c.gameCenter.dailyScores(v),
      },
      {
        name: 'shift-chart-data',
        description: 'Player shift data for a game',
        args: [
          gameId,
          {
            name: 'excludes',
            type: 'list',
            description: 'Comma-separated fields to exclude',
            default: 'eventDetails',
          },
        ],
        run: (c, v) => c.gameCenter.shiftChartData(v),
      },
      {
        name: 'season-series-matchup',
        description: 'Season series record and context for a game',
        args: [gameId],
        run: (c, v) => c.gameCenter.seasonSeriesMatchup(v),
      },
      {
        name: 'game-story',
        description: 'Narrative game story',
        args: [gameId],
        run: (c, v) => c.gameCenter.gameStory(v),
      },
    ],
  },
  {
    name: 'stats',
    description: 'Player, team and goalie statistics',
    commands: [
      {
        name: 'gametypes-per-season-directory-by-team',
        description: 'Game types a team played each season',
        args: [teamAbbr],
        run: (c, v) => c.stats.gametypesPerSeasonDirectoryByTeam(v),
      },
      {
        name: 'player-career-stats',
        description: "A player's career stats and bio",
        args: [playerId],
        run: (c, v) => c.stats.playerCareerStats(v),
      },
      {
        name: 'player-game-log',
        description: "A player's game log for a season",
        args: [
          playerId,
          req({
            name: 'seasonId',
            type: 'string',
            description: 'Season in YYYYYYYY format',
          }),
          req({
            name: 'gameType',
            type: 'int',
            description: '1=Preseason, 2=Regular, 3=Playoffs',
          }),
        ],
        run: (c, v) => c.stats.playerGameLog(v),
      },
      {
        name: 'team-summary',
        description: 'Team summary stats across seasons',
        args: [
          req({
            name: 'startSeason',
            type: 'string',
            description: 'First season, e.g. 20202021',
          }),
          req({
            name: 'endSeason',
            type: 'string',
            description: 'Last season, e.g. 20232024',
          }),
          gameTypeId,
          {
            name: 'isGame',
            type: 'boolean',
            description: 'Game-level rather than season-level stats',
          },
          {
            name: 'isAggregate',
            type: 'boolean',
            description: 'Aggregate across seasons',
          },
          sortExpr,
          start,
          limit('50'),
          factCayenneExp('gamesPlayed>1'),
          defaultCayenneExp,
        ],
        run: (c, v) => c.stats.teamSummary(v),
      },
      {
        name: 'skater-stats-summary',
        description: 'Skater summary stats across seasons',
        args: [
          req({
            name: 'startSeason',
            type: 'string',
            description: 'First season, e.g. 20232024',
          }),
          req({
            name: 'endSeason',
            type: 'string',
            description: 'Last season, e.g. 20232024',
          }),
          {
            name: 'franchiseId',
            type: 'string',
            description: 'Limit to a franchise',
          },
          gameTypeId,
          {
            name: 'aggregate',
            type: 'boolean',
            description: 'Aggregate across seasons',
          },
          sortExpr,
          start,
          limit('25'),
          factCayenneExp('gamesPlayed>=1'),
          defaultCayenneExp,
        ],
        run: (c, v) => c.stats.skaterStatsSummary(v),
      },
      {
        name: 'skater-stats-with-query-context',
        description:
          'Skater stats for any report type, filtered with query-builder filters',
        args: [
          req({
            name: 'reportType',
            type: 'string',
            description: `Report type: ${SKATER_REPORT_TYPES.join(', ')}`,
          }),
          ...queryFilterArgs,
          sortExpr,
          {
            name: 'aggregate',
            type: 'boolean',
            description: 'Aggregate across seasons',
          },
          start,
          limit('25'),
        ],
        run: (c, v) =>
          c.stats.skaterStatsWithQueryContext({
            queryContext: buildQueryContext(v),
            reportType: v.reportType,
            sortExpr: v.sortExpr,
            aggregate: v.aggregate,
            start: v.start,
            limit: v.limit,
          }),
      },
      {
        name: 'goalie-stats-summary',
        description: 'Goalie stats for a report type across seasons',
        args: [
          req({
            name: 'startSeason',
            type: 'string',
            description: 'First season, e.g. 20232024',
          }),
          {
            name: 'endSeason',
            type: 'string',
            description: 'Last season (defaults to --start-season)',
          },
          {
            name: 'statsType',
            type: 'string',
            description:
              'Report type: summary, advanced, bios, daysrest, penaltyShots, savesByStrength, shootout, startedVsRelieved',
            default: 'summary',
          },
          gameTypeId,
          {
            name: 'franchiseId',
            type: 'string',
            description: 'Limit to a franchise',
          },
          {
            name: 'aggregate',
            type: 'boolean',
            description: 'Aggregate across seasons',
          },
          sortExpr,
          start,
          limit('25'),
          factCayenneExp(),
          defaultCayenneExp,
        ],
        run: (c, v) => c.stats.goalieStatsSummary(v),
      },
    ],
  },
  {
    name: 'edge',
    description: 'NHL EDGE puck and player tracking stats',
    commands: [
      edgeCommand(
        'skater-detail',
        'skaterDetail',
        'player',
        'EDGE skater detail stats',
      ),
      edgeCommand(
        'skater-shot-speed-detail',
        'skaterShotSpeedDetail',
        'player',
        'EDGE skater shot speed',
      ),
      edgeCommand(
        'skater-skating-speed-detail',
        'skaterSkatingSpeedDetail',
        'player',
        'EDGE skater skating speed',
      ),
      edgeCommand(
        'skater-shot-location-detail',
        'skaterShotLocationDetail',
        'player',
        'EDGE skater shot locations',
      ),
      edgeCommand(
        'skater-skating-distance-detail',
        'skaterSkatingDistanceDetail',
        'player',
        'EDGE skater skating distance',
      ),
      edgeCommand(
        'skater-comparison',
        'skaterComparison',
        'player',
        'EDGE skater comparison stats',
      ),
      edgeCommand(
        'skater-zone-time',
        'skaterZoneTime',
        'player',
        'EDGE skater zone time',
      ),
      edgeCommand(
        'skater-landing',
        'skaterLanding',
        'none',
        'EDGE skater landing page (league leaders)',
      ),
      edgeCommand(
        'cat-skater-detail',
        'catSkaterDetail',
        'player',
        'CAT (Catch All Tracking) skater detail',
      ),
      edgeCommand(
        'goalie-detail',
        'goalieDetail',
        'player',
        'EDGE goalie detail stats',
      ),
      edgeCommand(
        'goalie-shot-location-detail',
        'goalieShotLocationDetail',
        'player',
        'EDGE goalie shot locations',
      ),
      edgeCommand(
        'goalie-5v5-detail',
        'goalie5v5Detail',
        'player',
        'EDGE goalie 5v5 performance',
      ),
      edgeCommand(
        'goalie-comparison',
        'goalieComparison',
        'player',
        'EDGE goalie comparison stats',
      ),
      edgeCommand(
        'goalie-save-percentage-detail',
        'goalieSavePercentageDetail',
        'player',
        'EDGE goalie save percentage',
      ),
      edgeCommand(
        'goalie-landing',
        'goalieLanding',
        'none',
        'EDGE goalie landing page (league leaders)',
      ),
      edgeCommand(
        'cat-goalie-detail',
        'catGoalieDetail',
        'player',
        'CAT (Catch All Tracking) goalie detail',
      ),
      edgeCommand(
        'team-detail',
        'teamDetail',
        'team',
        'EDGE team detail stats',
      ),
      edgeCommand(
        'team-skating-distance-detail',
        'teamSkatingDistanceDetail',
        'team',
        'EDGE team skating distance',
      ),
      edgeCommand(
        'team-zone-time-details',
        'teamZoneTimeDetails',
        'team',
        'EDGE team zone time',
      ),
      edgeCommand(
        'team-shot-location-detail',
        'teamShotLocationDetail',
        'team',
        'EDGE team shot locations',
      ),
      edgeCommand(
        'team-landing',
        'teamLanding',
        'none',
        'EDGE team landing page (league leaders)',
      ),
      edgeCommand(
        'team-shot-speed-detail',
        'teamShotSpeedDetail',
        'team',
        'EDGE team shot speed',
      ),
      edgeCommand(
        'team-skating-speed-detail',
        'teamSkatingSpeedDetail',
        'team',
        'EDGE team skating speed',
      ),
    ],
  },
  {
    name: 'players',
    description: 'Prospects and team rosters',
    commands: [
      {
        name: 'prospects-by-team',
        description: "A team's prospects grouped by position",
        args: [teamAbbr],
        run: (c, v) => c.players.prospectsByTeam(v),
      },
      {
        name: 'players-by-team',
        description: "A team's roster for a season",
        args: [teamAbbr, req(season)],
        run: (c, v) => c.players.playersByTeam(v),
      },
    ],
  },
  {
    name: 'misc',
    description: 'Glossary, countries, config and other reference data',
    commands: [
      {
        name: 'glossary',
        description: 'Glossary of stat terms',
        args: [],
        run: (c) => c.misc.glossary(),
      },
      {
        name: 'config',
        description: 'Stats API configuration (report types, filters)',
        args: [],
        run: (c) => c.misc.config(),
      },
      {
        name: 'countries',
        description: 'Countries recognized by the NHL',
        args: [],
        run: (c) => c.misc.countries(),
      },
      {
        name: 'season-specific-rules-and-info',
        description: 'Rules and metadata for every season',
        args: [],
        run: (c) => c.misc.seasonSpecificRulesAndInfo(),
      },
      {
        name: 'draft-year-and-rounds',
        description: 'Number of rounds for each draft year',
        args: [],
        run: (c) => c.misc.draftYearAndRounds(),
      },
    ],
  },
  {
    name: 'helpers',
    description: 'Multi-request convenience methods (slow; rate limited)',
    commands: [
      {
        name: 'game-ids-by-season',
        description: 'All game ids in a season (via every team schedule)',
        args: [
          req(season),
          {
            name: 'gameTypes',
            type: 'int-list',
            description: 'Comma-separated game types to include, e.g. 2,3',
          },
          apiSleepRate('1'),
        ],
        run: (c, v) => c.helpers.gameIdsBySeason(v),
      },
      {
        name: 'all-players',
        description: 'Every rostered player in a season',
        args: [req(season), apiSleepRate('0.5')],
        run: (c, v) => c.helpers.allPlayers(v),
      },
      {
        name: 'all-players-summary-statistics',
        description:
          'Summary stats for every skater in a season, merged with roster info',
        args: [req(season), apiSleepRate('1')],
        run: (c, v) => c.helpers.allPlayersSummaryStatistics(v),
      },
    ],
  },
];
