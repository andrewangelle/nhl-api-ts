/**
 * Generates the response schemas and named responses in the SDK's
 * `openapi.yaml` from the interfaces in its `src/types/`, so the HTTP
 * description and the TypeScript types can't drift apart.
 *
 *   pnpm openapi:schemas
 *
 * Only the blocks between the `BEGIN GENERATED` / `END GENERATED` markers in
 * openapi.yaml are rewritten.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SDK_DIR } from '#src/paths.mjs';

const TYPES_DIR = `${SDK_DIR}src/types`;
const OPENAPI_PATH = `${SDK_DIR}openapi.yaml`;

type Schema = Record<string, unknown>;

interface Field {
  name: string;
  optional: boolean;
  type: string;
  description?: string;
}

interface Declaration {
  fields: Field[];
}

/** Types that are SDK-built or registries, not API payloads. */
const SKIPPED = new Set([
  'StatsApiPage',
  'SkaterReportRows',
  'GoalieReportRows',
  'AllPlayersEntry',
  'PlayerSummaryStatistics',
]);

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Splits `body` at top-level occurrences of `separator` (outside <>, (), {}). */
function splitTop(body: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if ('<({['.includes(char)) {
      depth += 1;
    } else if ('>)}]'.includes(char)) {
      depth -= 1;
    }

    if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);

  return parts;
}

function parseFields(body: string): Field[] {
  const fields: Field[] = [];
  let pendingDescription: string | undefined;
  let statement = '';
  let depth = 0;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();

    if (statement === '' && trimmed.startsWith('/**')) {
      pendingDescription = trimmed.replace(/^\/\*\*\s*|\s*\*\/$/g, '');
      continue;
    }

    if (statement === '' && trimmed === '') {
      continue;
    }

    statement += ` ${trimmed}`;
    for (const char of trimmed) {
      if ('<({['.includes(char)) {
        depth += 1;
      } else if ('>)}]'.includes(char)) {
        depth -= 1;
      }
    }

    if (depth === 0 && trimmed.endsWith(';')) {
      const match = /^\s*('?[\w-]+'?)(\?)?:\s*([\s\S]+);$/.exec(statement);
      if (match) {
        fields.push({
          name: match[1].replace(/'/g, ''),
          optional: match[2] === '?',
          type: squash(match[3]),
          description: pendingDescription,
        });
      }
      statement = '';
      pendingDescription = undefined;
    }
  }

  return fields;
}

function loadDeclarations(): {
  interfaces: Map<string, Declaration>;
  aliases: Map<string, string>;
} {
  const interfaces = new Map<string, Declaration>();
  const aliases = new Map<string, string>();

  for (const file of readdirSync(TYPES_DIR).sort()) {
    if (file === 'index.mts' || file === 'helpers.mts') {
      continue;
    }

    const text = readFileSync(`${TYPES_DIR}/${file}`, 'utf8');

    for (const match of text.matchAll(
      /export interface (\w+)(<[^>]*>)? \{\n([\s\S]*?)\n\}/g,
    )) {
      if (!SKIPPED.has(match[1])) {
        interfaces.set(match[1], { fields: parseFields(match[3]) });
      }
    }

    for (const match of text.matchAll(/export type (\w+) =([\s\S]*?);\n/g)) {
      aliases.set(match[1], squash(match[2]));
    }
  }

  return { interfaces, aliases };
}

const OPEN_UNION = /^OpenUnion<([\s\S]*)>$/;

function typeToSchema(
  type: string,
  aliases: Map<string, string>,
  interfaces: Map<string, Declaration>,
): Schema {
  const text = squash(type);
  const members = splitTop(text, '|').map(squash).filter(Boolean);

  if (members.length > 1) {
    const nullable = members.includes('null');
    const rest = members.filter((member) => member !== 'null');
    const schemas = rest.map((member) =>
      typeToSchema(member, aliases, interfaces),
    );

    if (schemas.length === 1) {
      return nullable ? { oneOf: [schemas[0], { type: 'null' }] } : schemas[0];
    }

    return { oneOf: nullable ? [...schemas, { type: 'null' }] : schemas };
  }

  if (text.endsWith('[]')) {
    const inner = text.slice(0, -2).replace(/^\(([\s\S]*)\)$/, '$1');
    return { type: 'array', items: typeToSchema(inner, aliases, interfaces) };
  }

  const openUnion = OPEN_UNION.exec(text);

  if (openUnion) {
    const known = splitTop(openUnion[1], '|')
      .map(squash)
      .filter(Boolean)
      .map((literal) => literal.replace(/^'|'$/g, ''));

    return {
      type: 'string',
      description: `Known values: ${known.join(', ')}. Others may appear.`,
    };
  }

  const record = /^Record<string, ([\s\S]+)>$/.exec(text);

  if (record) {
    return record[1] === 'never'
      ? { type: 'object', maxProperties: 0 }
      : {
          type: 'object',
          additionalProperties: typeToSchema(record[1], aliases, interfaces),
        };
  }

  if (/^'.*'$/.test(text)) {
    return { const: text.slice(1, -1) };
  }

  switch (text) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'unknown':
      return {};
    case 'Play':
      // a union over the PlayTypes registry, emitted in generatedBlocks
      return { $ref: '#/components/schemas/Play' };
    case 'GameType':
      return {
        type: 'integer',
        description:
          '1 = preseason, 2 = regular season, 3 = playoffs. Others exist.',
      };
    case 'SeasonId':
      return { type: 'integer', description: 'YYYYYYYY, e.g. 20232024.' };
    default:
      break;
  }

  const alias = aliases.get(text);

  if (alias !== undefined) {
    return typeToSchema(alias, aliases, interfaces);
  }

  if (interfaces.has(text)) {
    return { $ref: `#/components/schemas/${text}` };
  }

  throw new Error(`openapi: cannot map type '${text}'`);
}

function interfaceSchema(
  declaration: Declaration,
  aliases: Map<string, string>,
  interfaces: Map<string, Declaration>,
): Schema {
  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  for (const field of declaration.fields) {
    const schema = typeToSchema(field.type, aliases, interfaces);

    if (field.description && !('$ref' in schema)) {
      schema.description = schema.description
        ? `${field.description} ${schema.description}`
        : field.description;
    }

    properties[field.name] = schema;

    if (!field.optional) {
      required.push(field.name);
    }
  }

  return {
    type: 'object',
    ...(required.length > 0 ? { required } : {}),
    properties,
  };
}

function ref(name: string): Schema {
  return {
    $ref: `#/components/schemas/${name}`,
  };
}

function arrayOf(name: string): Schema {
  return { type: 'array', items: ref(name) };
}

function page(name: string): Schema {
  return {
    type: 'object',
    required: ['data', 'total'],
    properties: { data: arrayOf(name), total: { type: 'integer' } },
  };
}

function wrapped(key: string, name: string): Schema {
  return {
    type: 'object',
    required: [key],
    properties: { [key]: arrayOf(name) },
  };
}

function oneOf(names: string[]): Schema {
  return { oneOf: names.map(ref) };
}

const SKATER_ROWS = [
  'SkaterSummaryRow',
  'SkaterBiosRow',
  'SkaterFaceoffPercentagesRow',
  'SkaterFaceoffWinsRow',
  'SkaterGoalsForAgainstRow',
  'SkaterPenaltiesRow',
  'SkaterPenaltyKillRow',
  'SkaterPenaltyShotsRow',
  'SkaterPercentagesRow',
  'SkaterPowerPlayRow',
  'SkaterPuckPossessionsRow',
  'SkaterRealtimeRow',
  'SkaterScoringRatesRow',
  'SkaterScoringPerGameRow',
  'SkaterShootoutRow',
  'SkaterSummaryShootingRow',
  'SkaterShotTypeRow',
  'SkaterTimeOnIceRow',
];

const GOALIE_ROWS = [
  'GoalieSummaryRow',
  'GoalieAdvancedRow',
  'GoalieBiosRow',
  'GoalieDaysRestRow',
  'GoaliePenaltyShotsRow',
  'GoalieSavesByStrengthRow',
  'GoalieShootoutRow',
  'GoalieStartedVsRelievedRow',
];

const EDGE_REPORTS = [
  'SkaterDetail',
  'SkaterShotSpeedDetail',
  'SkaterSkatingSpeedDetail',
  'SkaterShotLocationDetail',
  'SkaterSkatingDistanceDetail',
  'SkaterComparison',
  'SkaterZoneTime',
  'GoalieDetail',
  'GoalieShotLocationDetail',
  'Goalie5v5Detail',
  'GoalieComparison',
  'GoalieSavePercentageDetail',
  'TeamDetail',
  'TeamSkatingDistanceDetail',
  'TeamZoneTimeDetails',
  'TeamShotLocationDetail',
  'TeamShotSpeedDetail',
  'TeamSkatingSpeedDetail',
];

/** Named responses (`#/components/responses/<name>`) and the body schema each carries. */
const RESPONSES: Record<string, { description: string; schema: Schema }> = {
  Roster: { description: 'Team roster.', schema: ref('Roster') },
  RosterSeasons: {
    description: 'Seasons a team has a roster for, in YYYYYYYY format.',
    schema: { type: 'array', items: { type: 'integer' } },
  },
  TeamScoreboard: {
    description: "A team's recent and upcoming games.",
    schema: ref('TeamScoreboard'),
  },
  LeagueStandings: {
    description: 'League standings.',
    schema: ref('LeagueStandings'),
  },
  StandingsSeasons: {
    description: 'Standings metadata per season.',
    schema: wrapped('seasons', 'StandingsSeason'),
  },
  WeeklySchedule: {
    description: 'A week of games.',
    schema: ref('WeeklySchedule'),
  },
  ClubGames: {
    description: "A team's games.",
    schema: wrapped('games', 'ClubScheduleGame'),
  },
  TeamSeasonSchedule: {
    description: "A team's season schedule.",
    schema: ref('TeamSeasonSchedule'),
  },
  CalendarSchedule: {
    description: 'Schedule calendar.',
    schema: ref('CalendarSchedule'),
  },
  PlayoffCarousel: {
    description: 'Playoff series by round.',
    schema: ref('PlayoffCarousel'),
  },
  PlayoffSeriesSchedule: {
    description: 'A playoff series.',
    schema: ref('PlayoffSeriesSchedule'),
  },
  PlayoffBracket: {
    description: 'Playoff bracket.',
    schema: ref('PlayoffBracket'),
  },
  Boxscore: { description: 'Game boxscore.', schema: ref('Boxscore') },
  PlayByPlay: { description: 'Game play-by-play.', schema: ref('PlayByPlay') },
  GameLanding: {
    description: 'Game landing page.',
    schema: ref('GameLanding'),
  },
  RightRail: { description: 'Game right rail.', schema: ref('RightRail') },
  GameStory: { description: 'Game story.', schema: ref('GameStory') },
  DailyScores: {
    description: 'Scores for a date.',
    schema: ref('DailyScores'),
  },
  Prospects: { description: 'Team prospects.', schema: ref('Prospects') },
  PlayerSpotlight: {
    description: 'Players featured in the nhl.com spotlight.',
    schema: arrayOf('PlayerSpotlight'),
  },
  ClubStatsSeasons: {
    description: 'Seasons and game types a team played.',
    schema: arrayOf('ClubStatsSeason'),
  },
  PlayerLanding: {
    description: 'Player landing page.',
    schema: ref('PlayerLanding'),
  },
  PlayerGameLog: {
    description: 'Player game log.',
    schema: wrapped('gameLog', 'GameLogEntry'),
  },
  SkaterStatsLeaders: {
    description: 'Skater leaders keyed by category.',
    schema: ref('SkaterStatsLeaders'),
  },
  GoalieStatsLeaders: {
    description: 'Goalie leaders keyed by category.',
    schema: ref('GoalieStatsLeaders'),
  },
  ClubStats: {
    description: "A team's skater and goalie stats.",
    schema: ref('ClubStats'),
  },
  EdgeReport: {
    description: 'EDGE report; the shape depends on the `report` path segment.',
    schema: oneOf(EDGE_REPORTS),
  },
  CatEdgeReport: {
    description: 'CAT EDGE report.',
    schema: oneOf(['CatSkaterDetail', 'CatGoalieDetail']),
  },
  EdgeLanding: {
    description:
      'EDGE leaders; the shape depends on the `landing` path segment.',
    schema: oneOf(['SkaterLanding', 'GoalieLanding', 'TeamLanding']),
  },
  Franchises: { description: 'Franchises.', schema: page('Franchise') },
  ShiftChart: { description: 'Shift chart rows.', schema: ref('ShiftChart') },
  TeamSummary: {
    description: 'Team summary rows.',
    schema: page('TeamSummaryRow'),
  },
  SkaterReport: {
    description: 'Skater report rows; the row shape depends on `reportType`.',
    schema: {
      type: 'object',
      required: ['data', 'total'],
      properties: {
        data: { type: 'array', items: oneOf(SKATER_ROWS) },
        total: { type: 'integer' },
      },
    },
  },
  GoalieReport: {
    description: 'Goalie report rows; the row shape depends on `reportType`.',
    schema: {
      type: 'object',
      required: ['data', 'total'],
      properties: {
        data: { type: 'array', items: oneOf(GOALIE_ROWS) },
        total: { type: 'integer' },
      },
    },
  },
  Glossary: { description: 'Glossary.', schema: page('GlossaryEntry') },
  StatsConfig: {
    description: 'Stats API configuration.',
    schema: ref('StatsConfig'),
  },
  Countries: { description: 'Countries.', schema: page('Country') },
  Seasons: { description: 'Season rules.', schema: page('SeasonRules') },
  DraftYears: { description: 'Draft years.', schema: page('DraftYear') },
};

// ----- YAML -----
const SAFE_KEY = /^[A-Za-z_][\w-]*$/;

function yamlScalar(value: unknown): string {
  if (typeof value === 'string') {
    return /^[\w./ -]+$/.test(value) && !/^(true|false|null|\d.*)$/.test(value)
      ? value
      : `'${value.replace(/'/g, "''")}'`;
  }
  return String(value);
}

function toYaml(value: unknown, indent: number): string[] {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item !== null && typeof item === 'object') {
        const [first, ...rest] = toYaml(item, indent + 2);
        return [`${pad}- ${first.trimStart()}`, ...rest];
      }
      return [`${pad}- ${yamlScalar(item)}`];
    });
  }

  const lines: string[] = [];

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const name = SAFE_KEY.test(key) ? key : `'${key}'`;
    if (child !== null && typeof child === 'object') {
      const inner = toYaml(child, indent + 2);
      if (Array.isArray(child) && child.length === 0) {
        lines.push(`${pad}${name}: []`);
      } else if (!Array.isArray(child) && Object.keys(child).length === 0) {
        lines.push(`${pad}${name}: {}`);
      } else {
        lines.push(`${pad}${name}:`, ...inner);
      }
    } else {
      lines.push(`${pad}${name}: ${yamlScalar(child)}`);
    }
  }
  return lines;
}

export function generatedBlocks(): { schemas: string; responses: string } {
  const { interfaces, aliases } = loadDeclarations();
  const schemas: Record<string, Schema> = {};

  for (const [name, declaration] of [...interfaces].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    schemas[name] = interfaceSchema(declaration, aliases, interfaces);
  }

  // `Play` is a union over the PlayTypes registry.
  const playTypes = interfaces.get('PlayTypes');
  if (playTypes) {
    delete schemas.PlayTypes;
    schemas.Play = {
      oneOf: playTypes.fields.map((field) => ref(field.type)),
      discriminator: { propertyName: 'typeDescKey' },
    };
  }

  const responses: Record<string, Schema> = {};
  for (const [name, { description, schema }] of Object.entries(RESPONSES)) {
    responses[name] = {
      description,
      content: { 'application/json': { schema } },
    };
  }

  return {
    schemas: toYaml(schemas, 4).join('\n'),
    responses: toYaml(responses, 4).join('\n'),
  };
}

function marker(kind: string, edge: 'BEGIN' | 'END') {
  return `    # ${edge} GENERATED ${kind} (pnpm openapi:schemas)`;
}

export function applyBlocks(
  document: string,
  blocks: { schemas: string; responses: string },
): string {
  let output = document;

  for (const [kind, body] of [
    ['SCHEMAS', blocks.schemas],
    ['RESPONSES', blocks.responses],
  ] as const) {
    const start = marker(kind, 'BEGIN');
    const end = marker(kind, 'END');
    const from = output.indexOf(start);
    const to = output.indexOf(end);
    if (from === -1 || to === -1) {
      throw new Error(`openapi.yaml is missing the ${kind} markers`);
    }
    output = `${output.slice(0, from)}${start}\n${body}\n${output.slice(to)}`;
  }

  return output;
}

if (import.meta.main) {
  const current = readFileSync(OPENAPI_PATH, 'utf8');
  writeFileSync(OPENAPI_PATH, applyBlocks(current, generatedBlocks()));
  console.error('openapi.yaml: regenerated schemas and responses');
}
