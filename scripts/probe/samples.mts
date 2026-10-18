/**
 * Declarative sample matrix for the response-type probe. Every sample goes
 * through the real SDK, so a probe run also exercises each URL.
 */
import {
  createNHLClient,
  type GoalieReportRows,
  type NHLClient,
  type SkaterReportRows,
} from '#src/index.mjs';

export interface Sample {
  /** `<module>.<method>`, also the folder name under `.probe/raw`. */
  endpoint: string;
  tags: Record<string, string>;
  call: (client: NHLClient) => Promise<unknown>;
}

interface ScheduleGameLike {
  id: number;
  gameType: number;
  gameState?: string;
  gameOutcome?: { lastPeriodType?: string };
}

const SKATER = 8478402;
const GOALIE = 8476945;
const VETERAN = 8471214;
const RETIRED = 8448208;
const BUF_ID = 7;
const TOR_ID = 10;

function find(
  games: ScheduleGameLike[],
  test: (game: ScheduleGameLike) => boolean,
) {
  return games.find(test)?.id;
}

/** Picks interesting game ids (OT, shootout, preseason, future, live, legacy) at run time. */
async function discoverGames(
  client: NHLClient,
): Promise<Record<string, number>> {
  const found: Record<string, number> = {
    regular: 2023020280,
    playoff: 2023030411,
  };

  const season = (await client.schedule.teamSeasonSchedule({
    teamAbbr: 'BUF',
    season: '20232024',
  })) as unknown as { games: ScheduleGameLike[] };

  const ot = find(
    season.games,
    (game) => game.gameOutcome?.lastPeriodType === 'OT',
  );

  const shootout = find(
    season.games,
    (game) => game.gameOutcome?.lastPeriodType === 'SO',
  );
  const preseason = find(season.games, (game) => game.gameType === 1);

  if (ot) {
    found.overtime = ot;
  }

  if (shootout) {
    found.shootout = shootout;
  }

  if (preseason) {
    found.preseason = preseason;
  }

  const legacy = (await client.schedule.teamSeasonSchedule({
    teamAbbr: 'BUF',
    season: '19992000',
  })) as unknown as { games: ScheduleGameLike[] };

  if (legacy.games[0]) {
    found.legacy = legacy.games[0].id;
  }

  const current = (await client.schedule.teamSeasonSchedule({
    teamAbbr: 'BUF',
    season: 'now',
  })) as unknown as { games: ScheduleGameLike[] };

  const future = find(current.games, (game) => game.gameState === 'FUT');

  if (future) {
    found.future = future;
  }

  const scores = (await client.gameCenter.dailyScores({})) as unknown as {
    games?: ScheduleGameLike[];
  };

  const live = find(scores.games ?? [], (game) =>
    ['LIVE', 'CRIT'].includes(game.gameState ?? ''),
  );

  if (live) {
    found.live = live;
  }
  return found;
}

export async function buildSamples(): Promise<Sample[]> {
  const bootstrap = createNHLClient();
  const games = await discoverGames(bootstrap);
  const config = (await bootstrap.misc.config()) as unknown as {
    playerReportData: Record<string, unknown>;
    goalieReportData: Record<string, unknown>;
    teamReportData: Record<string, unknown>;
  };
  const samples: Sample[] = [];
  function add(
    endpoint: string,
    tags: Record<string, string>,
    call: Sample['call'],
  ) {
    return samples.push({ endpoint, tags, call });
  }

  // ----- game center -----
  for (const [kind, gameId] of Object.entries(games)) {
    add('gameCenter.boxscore', { game: kind }, (c) =>
      c.gameCenter.boxscore({ gameId }),
    );
    add('gameCenter.playByPlay', { game: kind }, (c) =>
      c.gameCenter.playByPlay({ gameId }),
    );
    add('gameCenter.matchUp', { game: kind }, (c) =>
      c.gameCenter.matchUp({ gameId }),
    );
    add('gameCenter.seasonSeriesMatchup', { game: kind }, (c) =>
      c.gameCenter.seasonSeriesMatchup({ gameId }),
    );
    add('gameCenter.gameStory', { game: kind }, (c) =>
      c.gameCenter.gameStory({ gameId }),
    );
    add('gameCenter.shiftChartData', { game: kind, excludes: 'default' }, (c) =>
      c.gameCenter.shiftChartData({ gameId }),
    );
  }
  add('gameCenter.shiftChartData', { game: 'regular', excludes: 'none' }, (c) =>
    c.gameCenter.shiftChartData({ gameId: games.regular, excludes: [] }),
  );
  for (const [kind, date] of [
    ['now', undefined],
    ['regular', '2023-10-15'],
    ['offseason', '2024-08-01'],
    ['playoff', '2024-05-01'],
    ['allstar', '2024-02-03'],
  ] as const) {
    add('gameCenter.dailyScores', { date: kind }, (c) =>
      c.gameCenter.dailyScores({ date }),
    );
  }

  // ----- schedule -----
  for (const [kind, date] of [
    ['regular', '2023-10-15'],
    ['offseason', '2024-08-01'],
    ['playoff', '2024-05-01'],
    ['allstar', '2024-02-03'],
    ['now', undefined],
  ] as const) {
    add('schedule.weeklySchedule', { date: kind }, (c) =>
      c.schedule.weeklySchedule({ date }),
    );
    add('schedule.calendarSchedule', { date: kind }, (c) =>
      c.schedule.calendarSchedule({ date: date ?? 'now' }),
    );
  }
  add('schedule.dailySchedule', { date: 'regular' }, (c) =>
    c.schedule.dailySchedule({ date: '2023-10-15' }),
  );
  add('schedule.dailySchedule', { date: 'offseason' }, (c) =>
    c.schedule.dailySchedule({ date: '2024-08-01' }),
  );
  for (const teamAbbr of ['BUF', 'TOR', 'UTA']) {
    add('schedule.teamMonthlySchedule', { team: teamAbbr, month: 'now' }, (c) =>
      c.schedule.teamMonthlySchedule({ teamAbbr }),
    );
    add('schedule.teamWeeklySchedule', { team: teamAbbr, week: 'now' }, (c) =>
      c.schedule.teamWeeklySchedule({ teamAbbr }),
    );
    add('schedule.teamSeasonSchedule', { team: teamAbbr, season: 'now' }, (c) =>
      c.schedule.teamSeasonSchedule({ teamAbbr, season: 'now' }),
    );
  }
  add('schedule.teamMonthlySchedule', { team: 'BUF', month: '2023-11' }, (c) =>
    c.schedule.teamMonthlySchedule({ teamAbbr: 'BUF', month: '2023-11' }),
  );
  add('schedule.teamWeeklySchedule', { team: 'BUF', week: '2024-02-10' }, (c) =>
    c.schedule.teamWeeklySchedule({ teamAbbr: 'BUF', date: '2024-02-10' }),
  );
  for (const [team, season] of [
    ['BUF', '20232024'],
    ['ARI', '20232024'],
    ['SEA', '20232024'],
    ['BUF', '19992000'],
  ]) {
    add('schedule.teamSeasonSchedule', { team, season }, (c) =>
      c.schedule.teamSeasonSchedule({ teamAbbr: team, season }),
    );
  }
  add('schedule.playoffCarousel', { season: '20232024' }, (c) =>
    c.schedule.playoffCarousel({ season: '20232024' }),
  );
  add('schedule.playoffCarousel', { season: '20052006' }, (c) =>
    c.schedule.playoffCarousel({ season: '20052006' }),
  );
  for (const series of ['a', 'h', 'm', 'o']) {
    add('schedule.playoffSeriesSchedule', { season: '20232024', series }, (c) =>
      c.schedule.playoffSeriesSchedule({ season: '20232024', series }),
    );
  }
  for (const year of [2024, 2023, 2015]) {
    add('schedule.playoffBracket', { year: String(year) }, (c) =>
      c.schedule.playoffBracket({ year }),
    );
  }

  // ----- teams / players / standings / misc -----
  for (const [team, season] of [
    ['BUF', '20232024'],
    ['TOR', '20232024'],
    ['UTA', '20242025'],
    ['SEA', '20232024'],
    ['ARI', '20232024'],
    ['BUF', '19992000'],
  ]) {
    add('teams.teamRoster', { team, season }, (c) =>
      c.teams.teamRoster({ teamAbbr: team, season }),
    );
    add('players.playersByTeam', { team, season }, (c) =>
      c.players.playersByTeam({ teamAbbr: team, season }),
    );
  }
  add('teams.franchises', {}, (c) => c.teams.franchises());
  for (const teamAbbr of ['BUF', 'TOR', 'UTA', 'SEA', 'ARI']) {
    add('players.prospectsByTeam', { team: teamAbbr }, (c) =>
      c.players.prospectsByTeam({ teamAbbr }),
    );
  }
  for (const [kind, params] of [
    ['now', {}],
    ['modern', { date: '2023-12-01' }],
    ['legacy', { date: '1918-02-01' }],
    ['season', { season: '20222023' }],
    ['season-2005', { season: '20052006' }],
  ] as const) {
    add('standings.leagueStandings', { variant: kind }, (c) =>
      c.standings.leagueStandings(params),
    );
  }
  add('standings.seasonStandingManifest', {}, (c) =>
    c.standings.seasonStandingManifest(),
  );
  add('misc.glossary', {}, (c) => c.misc.glossary());
  add('misc.config', {}, (c) => c.misc.config());
  add('misc.countries', {}, (c) => c.misc.countries());
  add('misc.seasonSpecificRulesAndInfo', {}, (c) =>
    c.misc.seasonSpecificRulesAndInfo(),
  );
  add('misc.draftYearAndRounds', {}, (c) => c.misc.draftYearAndRounds());

  // ----- stats -----
  for (const teamAbbr of ['BUF', 'TOR', 'UTA']) {
    add('stats.gametypesPerSeasonDirectoryByTeam', { team: teamAbbr }, (c) =>
      c.stats.gametypesPerSeasonDirectoryByTeam({ teamAbbr }),
    );
  }

  for (const [kind, playerId] of [
    ['skater', SKATER],
    ['goalie', GOALIE],
    ['veteran', VETERAN],
    ['retired', RETIRED],
  ] as const) {
    add('stats.playerCareerStats', { player: kind }, (c) =>
      c.stats.playerCareerStats({ playerId }),
    );
    for (const gameType of [1, 2, 3]) {
      add(
        'stats.playerGameLog',
        { player: kind, gameType: String(gameType) },
        (c) =>
          c.stats.playerGameLog({ playerId, seasonId: '20232024', gameType }),
      );
    }
  }

  for (const isGame of [false, true]) {
    for (const isAggregate of [false, true]) {
      add(
        'stats.teamSummary',
        { isGame: String(isGame), aggregate: String(isAggregate) },
        (c) =>
          c.stats.teamSummary({
            startSeason: '20232024',
            endSeason: '20232024',
            isGame,
            isAggregate,
            limit: 5,
          }),
      );
    }
  }

  for (const aggregate of [false, true]) {
    add('stats.skaterStatsSummary', { aggregate: String(aggregate) }, (c) =>
      c.stats.skaterStatsSummary({
        startSeason: '20222023',
        endSeason: '20232024',
        aggregate,
        limit: 5,
      }),
    );
  }

  for (const reportType of Object.keys(config.playerReportData)) {
    for (const aggregate of [false, true]) {
      add(
        'stats.skaterStatsWithQueryContext',
        { reportType, aggregate: String(aggregate) },
        async (c) =>
          c.stats.skaterStatsWithQueryContext({
            queryContext: {
              query:
                'gameTypeId=2 and seasonId<=20232024 and seasonId>=20222023',
              filters: [],
              errors: [],
              factQuery: 'gamesPlayed>=1',
            },
            // the report names come from the live config, not from the SDK's registry
            reportType: reportType as keyof SkaterReportRows,
            aggregate,
            limit: 5,
          }),
      );
    }
  }

  for (const statsType of Object.keys(config.goalieReportData)) {
    for (const aggregate of [false, true]) {
      add(
        'stats.goalieStatsSummary',
        { statsType, aggregate: String(aggregate) },
        async (c) =>
          c.stats.goalieStatsSummary({
            startSeason: '20222023',
            endSeason: '20232024',
            statsType: statsType as keyof GoalieReportRows,
            aggregate,
            limit: 5,
          }),
      );
    }
  }

  // ----- edge -----
  const seasonVariants: Record<string, { season?: string; gameType?: number }> =
    {
      now: {},
      regular: { season: '20232024', gameType: 2 },
      playoffs: { season: '20232024', gameType: 3 },
    };

  const skaterEdge = [
    'skaterDetail',
    'skaterShotSpeedDetail',
    'skaterSkatingSpeedDetail',
    'skaterShotLocationDetail',
    'skaterSkatingDistanceDetail',
    'skaterComparison',
    'skaterZoneTime',
    'catSkaterDetail',
  ] as const;

  const goalieEdge = [
    'goalieDetail',
    'goalieShotLocationDetail',
    'goalie5v5Detail',
    'goalieComparison',
    'goalieSavePercentageDetail',
    'catGoalieDetail',
  ] as const;

  const teamEdge = [
    'teamDetail',
    'teamSkatingDistanceDetail',
    'teamZoneTimeDetails',
    'teamShotLocationDetail',
    'teamShotSpeedDetail',
    'teamSkatingSpeedDetail',
  ] as const;

  for (const [variant, params] of Object.entries(seasonVariants)) {
    for (const method of skaterEdge) {
      add(`edge.${method}`, { player: 'skater', variant }, (c) =>
        c.edge[method]({ playerId: SKATER, ...params }),
      );
    }

    for (const method of goalieEdge) {
      add(`edge.${method}`, { player: 'goalie', variant }, (c) =>
        c.edge[method]({ playerId: GOALIE, ...params }),
      );
    }

    for (const [team, teamId] of [
      ['BUF', BUF_ID],
      ['TOR', TOR_ID],
    ] as const) {
      for (const method of teamEdge) {
        add(`edge.${method}`, { team, variant }, (c) =>
          c.edge[method]({ teamId, ...params }),
        );
      }
    }
  }

  for (const [variant, params] of Object.entries(seasonVariants)) {
    add('edge.skaterLanding', { variant }, (c) => c.edge.skaterLanding(params));
    add('edge.goalieLanding', { variant }, (c) => c.edge.goalieLanding(params));
    add('edge.teamLanding', { variant }, (c) => c.edge.teamLanding(params));
  }

  return samples;
}
