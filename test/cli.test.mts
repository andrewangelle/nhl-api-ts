import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { MODULES } from '#src/cli/commands.mjs';
import { runCli } from '#src/cli/run.mjs';
import { type ClientOptions, HttpClient, NHLClient } from '#src/index.mjs';
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
      return new NHLClient(clientOptions);
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

const kebab = (name: string) =>
  name
    .replace(/([a-z]{2})(\d)/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

describe('cli', () => {
  it('exposes every SDK method as a command', () => {
    const client = new NHLClient();
    const sdkModules = [
      'teams',
      'standings',
      'schedule',
      'gameCenter',
      'stats',
      'edge',
      'players',
      'misc',
      'helpers',
    ] as const;
    assert.deepEqual(
      MODULES.map((moduleSpec) => moduleSpec.name).sort(),
      sdkModules.map(kebab).sort(),
    );
    for (const name of sdkModules) {
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(client[name]),
      )
        .filter(
          (method) =>
            method !== 'constructor' &&
            method !== 'sleep' &&
            typeof (client[name] as never)[method] === 'function',
        )
        .filter(
          (method) =>
            ![
              'getEdge',
              'getWeb',
              'getData',
              'fetchStandingsData',
              'createTeam',
              'enrichTeamsWithFranchiseIds',
            ].includes(method),
        )
        .map(kebab)
        .sort();
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
      sort: '[{"property": "wins", "direction": "DESC"}]',
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
      '[{"property": "hits", "direction": "DESC"}, {"property": "playerId", "direction": "ASC"}]',
    );

    const vets = await run([
      'stats',
      'skater-stats-with-query-context',
      'summary',
      '--no-rookie',
    ]);
    assert.equal(queryOf(vets.urls[0]).cayenneExp, "isRookie='0'");
  });

  it('maps global options to client options', async () => {
    // --no-ssl-verify bypasses fetch, so stub the transport entirely
    mock.method(HttpClient.prototype, 'get', async () => new Response('{}'));
    const { options } = await run(
      [
        '--debug',
        '--timeout',
        '3',
        'misc',
        'config',
        '--no-follow-redirects',
        '--no-ssl-verify',
      ],
      () => ({ body: {} }),
    );
    assert.deepEqual(options, [
      { debug: true, timeout: 3, followRedirects: false, sslVerify: false },
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
