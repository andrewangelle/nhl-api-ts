import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { MODULES } from '#src/cli/commands.mjs';
import { runCli } from '#src/cli/run.mjs';
import { type ClientOptions, createNHLClient } from '#src/index.mjs';
import {
  calledUrls,
  mockFetch,
  queryOf,
  type Responder,
} from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

async function run(argv: string[], responder?: Responder) {
  const fetchMock = mockFetch(responder);
  const out: string[] = [];
  const err: string[] = [];
  const options: ClientOptions[] = [];
  const code = await runCli(argv, {
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    createClient: (clientOptions) => {
      options.push(clientOptions);
      return createNHLClient(clientOptions);
    },
  });
  return {
    code,
    stdout: out.join('\n'),
    stderr: err.join('\n'),
    urls: calledUrls(fetchMock),
    options,
  };
}

function kebab(name: string) {
  return name
    .replace(/([a-z]{2})(\d)/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

describe('cli', () => {
  it('exposes every SDK method as a command', () => {
    const client = createNHLClient();
    const sdkModules = [
      'teams',
      'standings',
      'schedule',
      'gameCenter',
      'stats',
      'edge',
      'players',
      'draft',
      'misc',
      'helpers',
    ] as const;
    assert.deepEqual(
      MODULES.map((moduleSpec) => moduleSpec.name).sort(),
      sdkModules.map(kebab).sort(),
    );
    // Every module is a plain `<module>Api` object of bound functions, so
    // `Object.keys` lists the public methods directly.
    for (const name of sdkModules) {
      const methods = Object.keys(client[name]).map(kebab).sort();
      const commands = MODULES.find(
        (moduleSpec) => moduleSpec.name === kebab(name),
      )
        ?.commands.map((command) => command.name)
        .sort();
      assert.deepEqual(commands, methods, `module ${name}`);
    }
  });

  it('prints root, module and command help', async () => {
    const root = await run(['--help']);
    assert.equal(root.code, 0);
    assert.match(root.stdout, /game-center/);

    const mod = await run(['edge', '--help']);
    assert.equal(mod.code, 0);
    assert.match(mod.stdout, /goalie-5v5-detail/);

    const cmd = await run(['game-center', 'boxscore', '-h']);
    assert.equal(cmd.code, 0);
    assert.match(cmd.stdout, /--game-id/);
    assert.deepEqual(cmd.urls, []);
  });

  it('prints the version', async () => {
    const { code, stdout } = await run(['--version']);
    assert.equal(code, 0);
    assert.match(stdout, /^\d+\.\d+\.\d+/);
  });

  it('accepts required args positionally or as flags', async () => {
    const positional = await run(
      ['game-center', 'boxscore', '2023020280'],
      () => ({
        body: { id: 1 },
      }),
    );
    const flagged = await run([
      'game-center',
      'boxscore',
      '--game-id',
      '2023020280',
    ]);
    assert.equal(positional.code, 0);
    assert.deepEqual(JSON.parse(positional.stdout), { id: 1 });
    assert.deepEqual(positional.urls, [
      'https://api-web.nhle.com/v1/gamecenter/2023020280/boxscore',
    ]);
    assert.deepEqual(flagged.urls, positional.urls);
  });

  it('prints compact JSON', async () => {
    const { stdout } = await run(['misc', 'countries', '--compact'], () => ({
      body: { data: [{ id: 'CAN' }] },
    }));
    assert.equal(stdout, '[{"id":"CAN"}]');
  });

  it('converts typed options', async () => {
    const { code, urls } = await run(
      [
        'stats',
        'team-summary',
        '20202021',
        '20232024',
        '--game-type-id',
        '3',
        '--limit',
        '5',
        '--is-aggregate',
        '--sort-expr',
        '[{"property":"wins","direction":"DESC"}]',
      ],
      () => ({ body: { data: [] } }),
    );
    assert.equal(code, 0);
    assert.deepEqual(queryOf(urls[0]), {
      isAggregate: 'true',
      isGame: 'false',
      start: '0',
      limit: '5',
      factCayenneExp: 'gamesPlayed>1',
      sort: '[{"property":"wins","direction":"DESC"}]',
      cayenneExp: 'gameTypeId=3 and seasonId<=20232024 and seasonId>=20202021',
    });
  });

  it('passes list options', async () => {
    const { urls } = await run([
      'game-center',
      'shift-chart-data',
      '1',
      '--excludes',
      'eventDetails,playerStats',
    ]);
    assert.match(urls[0], /&exclude=eventDetails,playerStats$/);
  });

  it('edge commands default to now and accept a season', async () => {
    const now = await run(['edge', 'skater-detail', '8478402']);
    assert.deepEqual(now.urls, [
      'https://api-web.nhle.com/v1/edge/skater-detail/8478402/now',
    ]);
    const season = await run([
      'edge',
      'team-landing',
      '--season',
      '20232024',
      '--game-type',
      '3',
    ]);
    assert.deepEqual(season.urls, [
      'https://api-web.nhle.com/v1/edge/team-landing/20232024/3',
    ]);
  });

  it('builds a query context from filter flags', async () => {
    const { code, urls } = await run(
      [
        'stats',
        'skater-stats-with-query-context',
        'realtime',
        '--season-start',
        '20232024',
        '--position',
        'F',
        '--rookie',
        '--active',
        '--nationality',
        'SWE',
      ],
      () => ({ body: { data: [] } }),
    );
    assert.equal(code, 0);
    const query = queryOf(urls[0]);
    assert.match(urls[0], /\/en\/skater\/realtime\?/);
    assert.equal(
      query.cayenneExp,
      "seasonId >= 20232024 and seasonId <= 20232024 and (positionCode='L' or positionCode='R' or positionCode='C') and nationalityCode='SWE' and isRookie='1' and active=1",
    );
    assert.equal(
      query.sort,
      '[{"property":"hits","direction":"DESC"},{"property":"playerId","direction":"ASC"}]',
    );

    const vets = await run([
      'stats',
      'skater-stats-with-query-context',
      'summary',
      '--no-rookie',
    ]);
    assert.equal(queryOf(vets.urls[0]).cayenneExp, "isRookie='0'");
  });

  it('passes an unknown report type through to the API', async () => {
    const { code, urls } = await run(
      ['stats', 'skater-stats-with-query-context', 'brandNewReport'],
      () => ({ body: { data: [], total: 0 } }),
    );
    assert.equal(code, 0);
    assert.match(urls[0], /\/en\/skater\/brandNewReport\?/);

    const goalies = await run(
      [
        'stats',
        'goalie-stats-summary',
        '20232024',
        '--stats-type',
        'brandNewReport',
      ],
      () => ({ body: { data: [] } }),
    );
    assert.equal(goalies.code, 0);
    assert.match(goalies.urls[0], /\/en\/goalie\/brandNewReport\?/);
  });

  it('draft picks converts the round and keeps all', async () => {
    const round = await run([
      'draft',
      'picks',
      '--season',
      '2023',
      '--round',
      '3',
    ]);
    assert.equal(round.code, 0);
    assert.deepEqual(round.urls, [
      'https://api-web.nhle.com/v1/draft/picks/2023/3',
    ]);
    const all = await run(['draft', 'picks', '--season', '2023']);
    assert.deepEqual(all.urls, [
      'https://api-web.nhle.com/v1/draft/picks/2023/all',
    ]);
    const rankings = await run([
      'draft',
      'rankings',
      '--season',
      '2023',
      '--category',
      '2',
    ]);
    assert.deepEqual(rankings.urls, [
      'https://api-web.nhle.com/v1/draft/rankings/2023/2',
    ]);
  });

  it('edge top-10 commands fill the path slots', async () => {
    const defaults = await run([
      'edge',
      'skater-shot-location-top-10',
      'goals',
    ]);
    assert.equal(defaults.code, 0);
    assert.deepEqual(defaults.urls, [
      'https://api-web.nhle.com/v1/edge/skater-shot-location-top-10/all/goals/all/now',
    ]);
    const full = await run([
      'edge',
      'team-zone-time-top-10',
      '--strength',
      'pp',
      '--sort-by',
      'defensive',
      '--season',
      '20242025',
      '--game-type',
      '3',
    ]);
    assert.deepEqual(full.urls, [
      'https://api-web.nhle.com/v1/edge/team-zone-time-top-10/pp/defensive/20242025/3',
    ]);
  });

  it('maps global options to client options', async () => {
    const { options } = await run(
      ['--debug', '--timeout', '3', 'misc', 'config', '--no-follow-redirects'],
      () => ({ body: {} }),
    );
    assert.deepEqual(options, [
      { debug: true, timeout: 3, followRedirects: false },
    ]);
    const defaults = await run(['misc', 'config']);
    assert.deepEqual(defaults.options, [{}]);
  });

  const usageErrors: [string[], RegExp][] = [
    [[], /missing <module>/],
    [['nope'], /unknown module 'nope'/],
    [['teams'], /missing <command>/],
    [['teams', 'nope'], /unknown command 'nope'/],
    [['game-center', 'boxscore'], /missing required argument: <game-id>/],
    [['game-center', 'boxscore', '1', '2'], /unexpected argument '2'/],
    [['game-center', 'boxscore', '1', '--bogus'], /Unknown option '--bogus'/],
    [
      ['stats', 'team-summary', '1', '2', '--limit', 'ten'],
      /--limit must be an integer/,
    ],
    [
      ['stats', 'team-summary', '1', '2', '--sort-expr', '{'],
      /--sort-expr must be valid JSON/,
    ],
    [
      [
        'stats',
        'skater-stats-with-query-context',
        'summary',
        '--position',
        'X',
      ],
      /--position must be one of/,
    ],
    [
      [
        'stats',
        'skater-stats-with-query-context',
        'summary',
        '--draft-round',
        '1',
      ],
      /--draft-round requires --draft-year/,
    ],
    [
      ['schedule', 'daily-schedule', '--date', '2024-02-30'],
      /Invalid date format/,
    ],
    [
      ['draft', 'picks', '--season', '2023', '--round', '8'],
      /--round must be one of/,
    ],
    [
      ['edge', 'skater-speed-top-10', '--sort-by', 'fastest'],
      /--sort-by must be one of/,
    ],
    [['edge', 'team-zone-time-top-10', '--strength', 'pp'], /sort-by/],
    [
      ['misc', 'config', '--timeout', '0'],
      /--timeout must be a positive number/,
    ],
  ];

  for (const [argv, message] of usageErrors) {
    it(`exits 2 for: ${argv.join(' ') || '(no args)'}`, async () => {
      const { code, stderr, stdout, urls } = await run(argv);
      assert.equal(code, 2);
      assert.match(stderr, message);
      assert.equal(stdout, '');
      assert.deepEqual(urls, []);
    });
  }

  it('exits 1 on API errors', async () => {
    const { code, stderr, stdout } = await run(
      ['game-center', 'boxscore', '1'],
      () => ({
        status: 404,
        body: { message: 'Not here' },
      }),
    );
    assert.equal(code, 1);
    assert.equal(stdout, '');
    assert.match(
      stderr,
      /Request to gamecenter\/1\/boxscore failed: Not here \(HTTP 404\)/,
    );
  });
});
