import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { InvalidQueryValueException } from '#src/api/query/errors.mjs';
import {
  type ArgSpec,
  type CommandSpec,
  MODULES,
  type ModuleSpec,
  UsageError,
} from '#src/cli/commands.mjs';
import type { ClientOptions } from '#src/config.mjs';
import { NHLApiException } from '#src/errors.mjs';
import { colors } from '#src/logging.mjs';
import { NHLClient } from '#src/nhl-client.mjs';

const BIN = 'nhl-api-ts';

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  createClient?: (options: ClientOptions) => NHLClient;
}

const kebab = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const GLOBAL_OPTIONS = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  debug: { type: 'boolean' },
  timeout: { type: 'string' },
  'ssl-verify': { type: 'boolean' },
  'follow-redirects': { type: 'boolean' },
  compact: { type: 'boolean' },
} as const;

const GLOBAL_HELP = `Global options:
  -h, --help               Show help (also per module / command)
  -v, --version            Show version
      --compact            Print JSON on a single line
      --debug              Log requests to stderr
      --timeout <seconds>  Request timeout (default: 10)
      --no-ssl-verify      Skip TLS certificate verification
      --no-follow-redirects  Do not follow HTTP redirects`;

function version(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

// ---- Help -------------------------------------------------------------------

function table(rows: [string, string][], indent = 2): string {
  const width = Math.max(0, ...rows.map(([l]) => l.length));
  return rows
    .map(([l, r]) => `${' '.repeat(indent)}${l.padEnd(width)}  ${r}`)
    .join('\n');
}

function rootHelp(): string {
  return `Usage: ${BIN} ${colors.pass('<module> <command>')} [args] [options]

Command line access to the NHL API and NHL EDGE stats. Results are printed
as JSON on stdout.

Modules:
${table(MODULES.map((m) => [m.name, m.description]))}

${GLOBAL_HELP}

Examples:
  ${BIN} schedule daily-schedule --date 2024-10-09
  ${BIN} game-center boxscore 2023020280
  ${BIN} stats skater-stats-with-query-context summary --season-start 20232024 --position C

Run '${BIN} <module> --help' to list a module's commands.`;
}

function moduleHelp(mod: ModuleSpec): string {
  return `Usage: ${BIN} ${mod.name} ${colors.pass('<command>')} [args] [options]

${mod.description}

Commands:
${table(mod.commands.map((c) => [c.name, c.description]))}

Run '${BIN} ${mod.name} <command> --help' for command options.`;
}

function argLabel(arg: ArgSpec): string {
  const flag = `--${kebab(arg.name)}`;
  if (arg.type === 'boolean') {
    return flag;
  }
  return `${flag} <${kebab(arg.name)}>`;
}

function commandHelp(mod: ModuleSpec, cmd: CommandSpec): string {
  const required = cmd.args.filter((a) => a.required);
  const optional = cmd.args.filter((a) => !a.required);
  const usage = [
    BIN,
    mod.name,
    cmd.name,
    ...required.map((a) => colors.pass(`<${kebab(a.name)}>`)),
    optional.length ? '[options]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const describe = (a: ArgSpec): string => {
    const extras = [
      a.choices ? `one of: ${a.choices.join(', ')}` : '',
      a.default !== undefined ? `default: ${a.default}` : '',
    ].filter(Boolean);
    return extras.length
      ? `${a.description} (${extras.join('; ')})`
      : a.description;
  };

  const sections = [`Usage: ${usage}`, cmd.description];
  if (required.length) {
    sections.push(
      `Arguments (positional, or as flags):\n${table(
        required.map((a) => [
          `<${kebab(a.name)}>, ${argLabel(a)}`,
          describe(a),
        ]),
      )}`,
    );
  }
  if (optional.length) {
    sections.push(
      `Options:\n${table(optional.map((a) => [argLabel(a), describe(a)]))}`,
    );
  }
  sections.push(GLOBAL_HELP);
  return sections.join('\n\n');
}

// ---- Parsing ----------------------------------------------------------------

/** First two non-option tokens are the module and command names. */
function findTargets(argv: string[]): string[] {
  const targets: string[] = [];
  for (let i = 0; i < argv.length && targets.length < 2; i++) {
    const token = argv[i];
    if (token === '--') {
      break;
    }
    if (token === '--timeout') {
      i++;
      continue;
    }
    if (!token.startsWith('-')) {
      targets.push(token);
    }
  }
  return targets;
}

function convert(arg: ArgSpec, raw: string | boolean): unknown {
  const flag = `--${kebab(arg.name)}`;
  if (arg.type === 'boolean') {
    return raw;
  }
  const value = String(raw);

  if (arg.choices && !arg.choices.includes(value)) {
    throw new UsageError(
      `${flag} must be one of: ${arg.choices.join(', ')} (got '${value}')`,
    );
  }
  switch (arg.type) {
    case 'int': {
      if (!/^-?\d+$/.test(value)) {
        throw new UsageError(`${flag} must be an integer (got '${value}')`);
      }
      return Number(value);
    }
    case 'number': {
      const n = Number(value);
      if (value.trim() === '' || Number.isNaN(n)) {
        throw new UsageError(`${flag} must be a number (got '${value}')`);
      }
      return n;
    }
    case 'list':
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    case 'int-list':
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          if (!/^-?\d+$/.test(s)) {
            throw new UsageError(`${flag} must be comma-separated integers`);
          }
          return Number(s);
        });
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        throw new UsageError(`${flag} must be valid JSON`);
      }
    default:
      return value;
  }
}

interface Parsed {
  globals: {
    help?: boolean;
    version?: boolean;
    debug?: boolean;
    timeout?: string;
    'ssl-verify'?: boolean;
    'follow-redirects'?: boolean;
    compact?: boolean;
  };
  values: Record<string, unknown>;
}

function parseCommand(argv: string[], cmd: CommandSpec | undefined): Parsed {
  const commandOptions: Record<string, { type: 'string' | 'boolean' }> = {};
  for (const arg of cmd?.args ?? []) {
    commandOptions[kebab(arg.name)] = {
      type: arg.type === 'boolean' ? 'boolean' : 'string',
    };
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      allowNegative: true,
      strict: true,
      options: { ...GLOBAL_OPTIONS, ...commandOptions },
    });
  } catch (err) {
    throw new UsageError((err as Error).message);
  }

  const raw = parsed.values as Record<string, string | boolean | undefined>;
  const globals: Parsed['globals'] = {};
  for (const key of Object.keys(GLOBAL_OPTIONS)) {
    (globals as Record<string, unknown>)[key] = raw[key];
  }
  if (globals.help || !cmd) {
    return { globals, values: {} };
  }

  // Drop the module and command names; the rest fill required args in order.
  const extra = parsed.positionals.slice(2);
  const values: Record<string, unknown> = {};
  for (const arg of cmd.args) {
    const flagValue = raw[kebab(arg.name)];
    if (flagValue !== undefined) {
      values[arg.name] = convert(arg, flagValue);
    } else if (arg.required && extra.length > 0) {
      values[arg.name] = convert(arg, extra.shift() as string);
    }
  }
  if (extra.length > 0) {
    throw new UsageError(`unexpected argument '${extra[0]}'`);
  }
  const missing = cmd.args.filter(
    (a) => a.required && values[a.name] === undefined,
  );
  if (missing.length > 0) {
    throw new UsageError(
      `missing required argument${missing.length > 1 ? 's' : ''}: ${missing
        .map((a) => `<${kebab(a.name)}>`)
        .join(', ')}`,
    );
  }
  return { globals, values };
}

function clientOptions(globals: Parsed['globals']): ClientOptions {
  const options: ClientOptions = {};
  if (globals.debug) {
    options.debug = true;
  }
  if (globals['ssl-verify'] === false) {
    options.sslVerify = false;
  }
  if (globals['follow-redirects'] === false) {
    options.followRedirects = false;
  }
  if (globals.timeout !== undefined) {
    const timeout = Number(globals.timeout);
    if (!(timeout > 0)) {
      throw new UsageError(
        `--timeout must be a positive number of seconds (got '${globals.timeout}')`,
      );
    }
    options.timeout = timeout;
  }
  return options;
}

// ---- Entry ------------------------------------------------------------------

/** Runs the CLI and resolves with the process exit code. */
export async function runCli(argv: string[], io: CliIO): Promise<number> {
  const createClient = io.createClient ?? ((o) => new NHLClient(o));
  const [moduleName, commandName] = findTargets(argv);
  const mod = MODULES.find((m) => m.name === moduleName);
  const cmd = mod?.commands.find((c) => c.name === commandName);

  const usageError = (message: string, help: string): number => {
    io.stderr(`${colors.error(`error: ${message}`)}\n\n${help}`);
    return 2;
  };

  let parsed: Parsed;
  try {
    parsed = parseCommand(argv, cmd);
  } catch (err) {
    const help =
      cmd && mod ? commandHelp(mod, cmd) : mod ? moduleHelp(mod) : rootHelp();
    return usageError((err as Error).message, help);
  }
  const { globals, values } = parsed;

  if (globals.version) {
    io.stdout(version());
    return 0;
  }
  if (!moduleName) {
    if (globals.help) {
      io.stdout(rootHelp());
      return 0;
    }
    return usageError('missing <module>', rootHelp());
  }
  if (!mod) {
    return usageError(`unknown module '${moduleName}'`, rootHelp());
  }
  if (!commandName) {
    if (globals.help) {
      io.stdout(moduleHelp(mod));
      return 0;
    }
    return usageError('missing <command>', moduleHelp(mod));
  }
  if (!cmd) {
    return usageError(
      `unknown command '${commandName}' for module '${mod.name}'`,
      moduleHelp(mod),
    );
  }
  if (globals.help) {
    io.stdout(commandHelp(mod, cmd));
    return 0;
  }

  try {
    const client = createClient(clientOptions(globals));
    const result = await cmd.run(client, values);
    io.stdout(
      globals.compact
        ? JSON.stringify(result)
        : JSON.stringify(result, null, 2),
    );
    return 0;
  } catch (err) {
    if (
      err instanceof UsageError ||
      err instanceof InvalidQueryValueException ||
      err instanceof RangeError
    ) {
      return usageError(err.message, commandHelp(mod, cmd));
    }
    if (err instanceof NHLApiException) {
      io.stderr(colors.error(`error: ${err.message} (HTTP ${err.statusCode})`));
      return 1;
    }
    io.stderr(colors.error(`error: ${(err as Error)?.message ?? String(err)}`));
    return 1;
  }
}
