/**
 * Declarative sample matrix for response-type inference. Every sample goes
 * through the real SDK, so a fetch run also exercises each URL.
 */
import {
  createNHLClient,
  type GoalieReportRows,
  type NHLClient,
  type SkaterReportRows,
} from 'nhl-api-ts';

export interface Sample {
  /** `<module>.<method>`, also the folder name under `.api-types/raw`. */
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

/** Picks a goal and a shot event from a game's play-by-play, for `playReplay`. */
async function discoverReplayEvents(
  client: NHLClient,
  gameId: number,
): Promise<Record<string, number>> {
  const { plays } = (await client.gameCenter.playByPlay({
    gameId,
  })) as unknown as { plays: { eventId: number; typeDescKey: string }[] };
  const found: Record<string, number> = {};
  for (const [kind, typeDescKey] of [
    ['goal', 'goal'],
    ['shot', 'shot-on-goal'],
  ]) {
    const play = plays.find(
      (candidate) => candidate.typeDescKey === typeDescKey,
    );
    if (play) {
      found[kind] = play.eventId;
    }
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

  const replayEvents = await discoverReplayEvents(bootstrap, games.regular);

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
    add('gameCenter.boxscore', { game: kind }, (client) =>
      client.gameCenter.boxscore({ gameId }),
    );
    add('gameCenter.playByPlay', { game: kind }, (client) =>
      client.gameCenter.playByPlay({ gameId }),
    );
    add('gameCenter.matchUp', { game: kind }, (client) =>
      client.gameCenter.matchUp({ gameId }),
    );
    add('gameCenter.seasonSeriesMatchup', { game: kind }, (client) =>
      client.gameCenter.seasonSeriesMatchup({ gameId }),
    );
    add('gameCenter.gameStory', { game: kind }, (client) =>
      client.gameCenter.gameStory({ gameId }),
    );
    add(
      'gameCenter.shiftChartData',
      { game: kind, excludes: 'default' },
      (client) => client.gameCenter.shiftChartData({ gameId }),
    );
  }
  add(
    'gameCenter.shiftChartData',
    { game: 'regular', excludes: 'none' },
    (client) =>
      client.gameCenter.shiftChartData({ gameId: games.regular, excludes: [] }),
  );
  for (const [kind, date] of [
    ['now', undefined],
    ['regular', '2023-10-15'],
    ['offseason', '2024-08-01'],
    ['playoff', '2024-05-01'],
    ['allstar', '2024-02-03'],
  ] as const) {
    add('gameCenter.dailyScores', { date: kind }, (client) =>
      client.gameCenter.dailyScores({ date }),
    );
    add('gameCenter.scoreboard', { date: kind }, (client) =>
      client.gameCenter.scoreboard({ date }),
    );
    add('misc.tvSchedule', { date: kind }, (client) =>
      client.misc.tvSchedule({ date }),
    );
  }
  for (const kind of ['regular', 'playoff', 'overtime', 'future', 'legacy']) {
    const gameId = games[kind];
    if (gameId === undefined) {
      continue;
    }
    add('gameCenter.wscPlayByPlay', { game: kind }, (client) =>
      client.gameCenter.wscPlayByPlay({ gameId }),
    );
    add('gameCenter.gameMeta', { game: kind }, (client) =>
      client.gameCenter.gameMeta({ gameId }),
    );
  }
  for (const [kind, eventNumber] of Object.entries(replayEvents)) {
    add('gameCenter.playReplay', { game: 'regular', event: kind }, (client) =>
      client.gameCenter.playReplay({ gameId: games.regular, eventNumber }),
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
    add('schedule.weeklySchedule', { date: kind }, (client) =>
      client.schedule.weeklySchedule({ date }),
    );
    add('schedule.calendarSchedule', { date: kind }, (client) =>
      client.schedule.calendarSchedule({ date }),
    );
  }
  add('schedule.dailySchedule', { date: 'regular' }, (client) =>
    client.schedule.dailySchedule({ date: '2023-10-15' }),
  );
  add('schedule.dailySchedule', { date: 'offseason' }, (client) =>
    client.schedule.dailySchedule({ date: '2024-08-01' }),
  );
  for (const teamAbbr of ['BUF', 'TOR', 'UTA']) {
    add(
      'schedule.teamMonthlySchedule',
      { team: teamAbbr, month: 'now' },
      (client) => client.schedule.teamMonthlySchedule({ teamAbbr }),
    );
    add(
      'schedule.teamWeeklySchedule',
      { team: teamAbbr, week: 'now' },
      (client) => client.schedule.teamWeeklySchedule({ teamAbbr }),
    );
    add(
      'schedule.teamSeasonSchedule',
      { team: teamAbbr, season: 'now' },
      (client) => client.schedule.teamSeasonSchedule({ teamAbbr }),
    );
  }
  add(
    'schedule.teamMonthlySchedule',
    { team: 'BUF', month: '2023-11' },
    (client) =>
      client.schedule.teamMonthlySchedule({
        teamAbbr: 'BUF',
        month: '2023-11',
      }),
  );
  add(
    'schedule.teamWeeklySchedule',
    { team: 'BUF', week: '2024-02-10' },
    (client) =>
      client.schedule.teamWeeklySchedule({
        teamAbbr: 'BUF',
        date: '2024-02-10',
      }),
  );
  for (const [team, season] of [
    ['BUF', '20232024'],
    ['ARI', '20232024'],
    ['SEA', '20232024'],
    ['BUF', '19992000'],
  ]) {
    add('schedule.teamSeasonSchedule', { team, season }, (client) =>
      client.schedule.teamSeasonSchedule({ teamAbbr: team, season }),
    );
  }

  add('schedule.playoffCarousel', { season: '20232024' }, (client) =>
    client.schedule.playoffCarousel({ season: '20232024' }),
  );

  add('schedule.playoffCarousel', { season: '20052006' }, (client) =>
    client.schedule.playoffCarousel({ season: '20052006' }),
  );

  for (const series of ['a', 'h', 'm', 'o']) {
    add(
      'schedule.playoffSeriesSchedule',
      { season: '20232024', series },
      (client) =>
        client.schedule.playoffSeriesSchedule({ season: '20232024', series }),
    );
  }

  for (const year of [2024, 2023, 2015]) {
    add('schedule.playoffBracket', { year: String(year) }, (client) =>
      client.schedule.playoffBracket({ year }),
    );
  }

  for (const [year, series] of [
    [2024, 'a'],
    [2024, 'o'],
    [2015, 'h'],
  ] as const) {
    add(
      'schedule.playoffSeriesMeta',
      { year: String(year), series },
      (client) => client.schedule.playoffSeriesMeta({ year, series }),
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
    add('teams.teamRoster', { team, season }, (client) =>
      client.teams.teamRoster({ teamAbbr: team, season }),
    );
    add('players.playersByTeam', { team, season }, (client) =>
      client.players.playersByTeam({ teamAbbr: team, season }),
    );
  }

  for (const team of ['BUF', 'TOR']) {
    add('teams.teamRoster', { team, season: 'current' }, (client) =>
      client.teams.teamRoster({ teamAbbr: team }),
    );
    add('players.playersByTeam', { team, season: 'current' }, (client) =>
      client.players.playersByTeam({ teamAbbr: team }),
    );
    add('teams.teamScoreboard', { team }, (client) =>
      client.teams.teamScoreboard({ teamAbbr: team }),
    );
  }

  for (const team of ['BUF', 'TOR', 'UTA', 'SEA']) {
    add('teams.rosterSeasons', { team }, (client) =>
      client.teams.rosterSeasons({ teamAbbr: team }),
    );
  }

  add('teams.franchises', {}, (client) => client.teams.franchises());
  add('teams.statsTeams', {}, (client) => client.teams.statsTeams());
  for (const teamId of [TOR_ID, 32]) {
    add('teams.teamById', { team: String(teamId) }, (client) =>
      client.teams.teamById({ teamId }),
    );
  }
  for (const [kind, params] of [
    ['lastName', { name: 'Matthews' }],
    ['team', { teamId: BUF_ID, start: 5 }],
    ['retired', { cayenneExp: `id=${RETIRED}` }],
    ['sorted', { name: 'Smith', sort: 'id', dir: 'DESC' }],
  ] satisfies [string, Parameters<NHLClient['players']['playerSearch']>[0]][]) {
    add('players.playerSearch', { variant: kind }, (client) =>
      client.players.playerSearch(params),
    );
  }
  add('players.playerSpotlight', {}, (client) =>
    client.players.playerSpotlight(),
  );

  for (const teamAbbr of ['BUF', 'TOR', 'UTA', 'SEA', 'ARI']) {
    add('players.prospectsByTeam', { team: teamAbbr }, (client) =>
      client.players.prospectsByTeam({ teamAbbr }),
    );
  }

  for (const [kind, params] of [
    ['now', {}],
    ['modern', { date: '2023-12-01' }],
    ['legacy', { date: '1918-02-01' }],
    ['season', { season: '20222023' }],
    ['season-2005', { season: '20052006' }],
  ] as const) {
    add('standings.leagueStandings', { variant: kind }, (client) =>
      client.standings.leagueStandings(params),
    );
  }

  add('standings.seasonStandingManifest', {}, (client) =>
    client.standings.seasonStandingManifest(),
  );
  add('misc.glossary', {}, (client) => client.misc.glossary());
  add('misc.config', {}, (client) => client.misc.config());
  add('misc.countries', {}, (client) => client.misc.countries());
  add('misc.seasonSpecificRulesAndInfo', {}, (client) =>
    client.misc.seasonSpecificRulesAndInfo(),
  );
  add('misc.draftYearAndRounds', {}, (client) =>
    client.misc.draftYearAndRounds(),
  );
  add('misc.seasonIds', {}, (client) => client.misc.seasonIds());
  add('misc.location', {}, (client) => client.misc.location());
  for (const countryCode of ['US', 'CA']) {
    add('misc.partnerGameOdds', { country: countryCode }, (client) =>
      client.misc.partnerGameOdds({ countryCode }),
    );
  }
  for (const [kind, postalCode] of [
    ['us', '90210'],
    ['ca', 'M5V 3L9'],
    ['none', '00000'],
  ]) {
    add('misc.postalLookup', { postal: kind }, (client) =>
      client.misc.postalLookup({ postalCode }),
    );
  }
  add('misc.componentSeasons', {}, (client) => client.misc.componentSeasons());
  for (const season of ['20252026', '19801981']) {
    add('misc.games', { season }, (client) => client.misc.games({ season }));
  }
  for (const [kind, params] of [
    ['empty', {}],
    ['players', { players: [SKATER, GOALIE, RETIRED] }],
    ['teams', { teams: ['TOR', 'BUF'] }],
    ['both', { players: [SKATER], teams: ['TOR'] }],
  ] satisfies [string, { players?: number[]; teams?: string[] }][]) {
    add('misc.meta', { variant: kind }, (client) => client.misc.meta(params));
  }

  // ----- draft -----
  add('draft.rankings', { season: 'now' }, (client) => client.draft.rankings());
  for (const category of [1, 2, 3, 4] as const) {
    add(
      'draft.rankings',
      { season: '2023', category: String(category) },
      (client) => client.draft.rankings({ season: 2023, category }),
    );
  }
  add('draft.rankings', { season: '2008', category: '2' }, (client) =>
    client.draft.rankings({ season: 2008, category: 2 }),
  );
  add('draft.tracker', {}, (client) => client.draft.tracker());
  add('draft.picks', { season: 'now' }, (client) => client.draft.picks());
  for (const [season, round] of [
    [2023, 'all'],
    [2023, 7],
    [1979, 'all'],
  ] as const) {
    add(
      'draft.picks',
      { season: String(season), round: String(round) },
      (client) => client.draft.picks({ season, round }),
    );
  }

  // ----- stats -----
  for (const teamAbbr of ['BUF', 'TOR', 'UTA']) {
    add(
      'stats.gametypesPerSeasonDirectoryByTeam',
      { team: teamAbbr },
      (client) => client.stats.gametypesPerSeasonDirectoryByTeam({ teamAbbr }),
    );
  }

  for (const [kind, playerId] of [
    ['skater', SKATER],
    ['goalie', GOALIE],
    ['veteran', VETERAN],
    ['retired', RETIRED],
  ] as const) {
    add('stats.playerCareerStats', { player: kind }, (client) =>
      client.stats.playerCareerStats({ playerId }),
    );

    for (const gameType of [1, 2, 3]) {
      add(
        'stats.playerGameLog',
        { player: kind, gameType: String(gameType) },
        (client) =>
          client.stats.playerGameLog({
            playerId,
            seasonId: '20232024',
            gameType,
          }),
      );
    }
  }

  add('stats.playerGameLog', { player: 'skater', season: 'now' }, (client) =>
    client.stats.playerGameLog({ playerId: SKATER }),
  );

  for (const [variant, params] of [
    ['current', {}],
    ['regular', { season: '20232024', gameType: 2 }],
    ['playoffs', { season: '20232024', gameType: 3 }],
    ['legacy', { season: '19992000', gameType: 2 }],
  ] as const) {
    add('stats.skaterStatsLeaders', { variant }, (client) =>
      client.stats.skaterStatsLeaders(params),
    );
    add('stats.goalieStatsLeaders', { variant }, (client) =>
      client.stats.goalieStatsLeaders(params),
    );
  }

  for (const [team, variant, params] of [
    ['TOR', 'now', {}],
    ['BUF', 'regular', { season: '20232024', gameType: 2 }],
    ['TOR', 'playoffs', { season: '20232024', gameType: 3 }],
    ['BUF', 'no-playoffs', { season: '20232024', gameType: 3 }],
    ['BUF', 'legacy', { season: '19992000', gameType: 2 }],
  ] as const) {
    add('stats.clubStats', { team, variant }, (client) =>
      client.stats.clubStats({ teamAbbr: team, ...params }),
    );
  }

  for (const attribute of [
    'points',
    'goals',
    'assists',
    'gamesPlayed',
  ] as const) {
    add('stats.skaterLeaders', { attribute, season: 'all' }, (client) =>
      client.stats.skaterLeaders({ attribute }),
    );
    add('stats.skaterLeaders', { attribute, season: '20232024' }, (client) =>
      client.stats.skaterLeaders({ attribute, season: 20232024 }),
    );
  }
  for (const attribute of [
    'gaa',
    'savePctg',
    'shutouts',
    'timeOnIce',
    'gamesPlayed',
  ] as const) {
    add('stats.goalieLeaders', { attribute, season: 'all' }, (client) =>
      client.stats.goalieLeaders({ attribute }),
    );
    add('stats.goalieLeaders', { attribute, season: '20232024' }, (client) =>
      client.stats.goalieLeaders({ attribute, season: 20232024 }),
    );
  }
  add('stats.skaterMilestones', {}, (client) =>
    client.stats.skaterMilestones(),
  );
  add('stats.goalieMilestones', {}, (client) =>
    client.stats.goalieMilestones(),
  );

  for (const isGame of [false, true]) {
    for (const isAggregate of [false, true]) {
      add(
        'stats.teamSummary',
        { isGame: String(isGame), aggregate: String(isAggregate) },
        (client) =>
          client.stats.teamSummary({
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
    add(
      'stats.skaterStatsSummary',
      { aggregate: String(aggregate) },
      (client) =>
        client.stats.skaterStatsSummary({
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
        async (client) =>
          client.stats.skaterStatsWithQueryContext({
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
        async (client) =>
          client.stats.goalieStatsSummary({
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
      add(`edge.${method}`, { player: 'skater', variant }, (client) =>
        client.edge[method]({ playerId: SKATER, ...params }),
      );
    }

    for (const method of goalieEdge) {
      add(`edge.${method}`, { player: 'goalie', variant }, (client) =>
        client.edge[method]({ playerId: GOALIE, ...params }),
      );
    }

    for (const [team, teamId] of [
      ['BUF', BUF_ID],
      ['TOR', TOR_ID],
    ] as const) {
      for (const method of teamEdge) {
        add(`edge.${method}`, { team, variant }, (client) =>
          client.edge[method]({ teamId, ...params }),
        );
      }
    }
  }

  for (const [variant, params] of Object.entries(seasonVariants)) {
    add('edge.skaterLanding', { variant }, (client) =>
      client.edge.skaterLanding(params),
    );
    add('edge.goalieLanding', { variant }, (client) =>
      client.edge.goalieLanding(params),
    );
    add('edge.teamLanding', { variant }, (client) =>
      client.edge.teamLanding(params),
    );
  }

  for (const [variant, params] of Object.entries(seasonVariants)) {
    for (const [team, teamId] of [
      ['BUF', BUF_ID],
      ['TOR', TOR_ID],
    ] as const) {
      add('edge.teamComparison', { team, variant }, (client) =>
        client.edge.teamComparison({ teamId, ...params }),
      );
    }
    add('edge.byTheNumbers', { variant }, (client) =>
      client.edge.byTheNumbers(params),
    );
  }

  // Top-10 rows carry every metric whatever `sortBy` is, so one regular-season
  // sample per sortBy plus now/playoffs and the position/strength slots.
  const top10Variants: Record<string, { season?: string; gameType?: number }> =
    {
      now: {},
      regular: { season: '20252026', gameType: 2 },
      playoffs: { season: '20242025', gameType: 3 },
    };
  const top10: [
    keyof NHLClient['edge'],
    readonly string[],
    { positions?: boolean; strength?: boolean; category?: boolean },
  ][] = [
    [
      'skaterDistanceTop10',
      ['total', 'per-60', 'max-game', 'max-period'],
      { positions: true, strength: true },
    ],
    [
      'skaterSpeedTop10',
      ['max', 'over-22', '20-22', '18-20'],
      { positions: true },
    ],
    [
      'skaterZoneTimeTop10',
      ['offensive', 'neutral', 'defensive'],
      { positions: true, strength: true },
    ],
    [
      'skaterShotSpeedTop10',
      ['max', 'over-100', '90-99', '80-89', '70-79'],
      { positions: true },
    ],
    [
      'skaterShotLocationTop10',
      ['sog', 'goals', 'shooting-pctg'],
      { positions: true, category: true },
    ],
    [
      'goalie5v5Top10',
      ['save-pctg', 'save-pctg-close', 'shots', 'shots-per-60'],
      {},
    ],
    [
      'goalieShotLocationTop10',
      ['save-pctg', 'saves', 'goals-against', 'shots-against'],
      { category: true },
    ],
    ['goalieSavePercentageTop10', ['games', 'pctg'], {}],
    [
      'teamSkatingDistanceTop10',
      ['total', 'per-60', 'max-game', 'max-period'],
      { positions: true, strength: true },
    ],
    [
      'teamSkatingSpeedTop10',
      ['max', 'over-22', '20-22', '18-20'],
      { positions: true },
    ],
    [
      'teamZoneTimeTop10',
      ['offensive', 'neutral', 'defensive'],
      { strength: true },
    ],
    [
      'teamShotSpeedTop10',
      ['max', 'over-100', '90-99', '80-89', '70-79'],
      { positions: true },
    ],
    [
      'teamShotLocationTop10',
      ['sog', 'goals', 'shooting-pctg'],
      { positions: true, category: true },
    ],
  ];

  for (const [method, sortBys, slots] of top10) {
    function callTop10(params: Record<string, unknown>) {
      return (client: NHLClient) =>
        (client.edge[method] as (params: object) => Promise<unknown>)(params);
    }
    const regular = top10Variants.regular;

    for (const sortBy of sortBys) {
      add(
        `edge.${method}`,
        { sortBy, variant: 'regular' },
        callTop10({ sortBy, ...regular }),
      );
    }
    for (const variant of ['now', 'playoffs']) {
      add(
        `edge.${method}`,
        { sortBy: sortBys[0], variant },
        callTop10({ sortBy: sortBys[0], ...top10Variants[variant] }),
      );
    }
    if (slots.positions) {
      for (const positions of ['forwards', 'defense']) {
        add(
          `edge.${method}`,
          { sortBy: sortBys[0], positions, variant: 'regular' },
          callTop10({ sortBy: sortBys[0], positions, ...regular }),
        );
      }
    }
    if (slots.strength) {
      for (const strength of ['es', 'pp', 'pk']) {
        add(
          `edge.${method}`,
          { sortBy: sortBys[0], strength, variant: 'regular' },
          callTop10({ sortBy: sortBys[0], strength, ...regular }),
        );
      }
    }
    if (slots.category) {
      for (const category of ['high', 'mid', 'long']) {
        add(
          `edge.${method}`,
          { sortBy: sortBys[0], category, variant: 'regular' },
          callTop10({ sortBy: sortBys[0], category, ...regular }),
        );
      }
    }
  }

  return samples;
}
