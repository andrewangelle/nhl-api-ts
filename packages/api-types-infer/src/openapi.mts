/**
 * Generates the response schemas and named responses in the SDK's
 * `openapi.yaml` from the interfaces in its `src/types/`, so the HTTP
 * description and the TypeScript types can't drift apart.
 *
 *   pnpm openapi:schemas
 *
 * Only the blocks between the `BEGIN GENERATED` / `END GENERATED` markers in
 * openapi.yaml are rewritten. The types are read with the same loader as
 * conform (`declarations.mts`): each field's type node, in source order, with
 * names resolved through the type checker.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  type InterfaceDeclaration,
  Node,
  SyntaxKind,
  type TypeAliasDeclaration,
  type TypeNode,
} from 'ts-morph';
import { Declarations } from '#src/declarations.mjs';
import { SDK_DIR } from '#src/paths.mjs';
import { GROUP_REGISTRIES } from '#src/specs.mjs';

const TYPES_DIR = `${SDK_DIR}src/types`;
const OPENAPI_PATH = `${SDK_DIR}openapi.yaml`;

type Schema = Record<string, unknown>;

/** Types that are SDK-built or registries, not API payloads. */
const SKIPPED = new Set([
  'StatsApiPage',
  ...Object.values(GROUP_REGISTRIES),
  'AllPlayersEntry',
  'PlayerSummaryStatistics',
]);

/** Files that re-export or build SDK-only shapes. */
const SKIPPED_FILES = new Set(['index.mts', 'helpers.mts']);

interface TypeSource {
  interfaces: Map<string, InterfaceDeclaration>;
  aliases: Map<string, TypeAliasDeclaration>;
}

function loadDeclarations(): TypeSource {
  const { project } = Declarations.fromSdk(SDK_DIR);
  const interfaces = new Map<string, InterfaceDeclaration>();
  const aliases = new Map<string, TypeAliasDeclaration>();

  for (const file of project
    .getSourceFiles(`${TYPES_DIR}/*.mts`)
    .sort((left, right) =>
      left.getBaseName().localeCompare(right.getBaseName()),
    )) {
    if (SKIPPED_FILES.has(file.getBaseName())) {
      continue;
    }
    for (const declaration of file.getInterfaces()) {
      if (declaration.isExported() && !SKIPPED.has(declaration.getName())) {
        interfaces.set(declaration.getName(), declaration);
      }
    }
    for (const alias of file.getTypeAliases()) {
      if (alias.isExported()) {
        aliases.set(alias.getName(), alias);
      }
    }
  }

  return { interfaces, aliases };
}

/** The declaration a type reference points at, following imports. */
function referencedDeclaration(node: TypeNode): Node | undefined {
  if (!Node.isTypeReference(node)) {
    return undefined;
  }
  const symbol = node.getTypeName().getSymbol();
  const target = symbol?.isAlias() ? symbol.getAliasedSymbol() : symbol;
  return target?.getDeclarations()[0];
}

function isNull(node: TypeNode): boolean {
  return (
    Node.isLiteralTypeNode(node) &&
    node.getLiteral().getKind() === SyntaxKind.NullKeyword
  );
}

/** A literal's text without its quotes, as written. */
function literalText(node: TypeNode): string {
  return node.getText().replace(/^'|'$/g, '');
}

function typeToSchema(node: TypeNode, source: TypeSource): Schema {
  if (Node.isParenthesizedTypeNode(node)) {
    return typeToSchema(node.getTypeNode(), source);
  }

  if (Node.isUnionTypeNode(node)) {
    const members = node.getTypeNodes();
    const nullable = members.some(isNull);
    const schemas = members
      .filter((member) => !isNull(member))
      .map((member) => typeToSchema(member, source));

    if (schemas.length === 1) {
      return nullable ? { oneOf: [schemas[0], { type: 'null' }] } : schemas[0];
    }

    return { oneOf: nullable ? [...schemas, { type: 'null' }] : schemas };
  }

  if (Node.isArrayTypeNode(node)) {
    return {
      type: 'array',
      items: typeToSchema(node.getElementTypeNode(), source),
    };
  }

  if (Node.isLiteralTypeNode(node) && Node.isStringLiteral(node.getLiteral())) {
    return { const: literalText(node) };
  }

  switch (node.getKind()) {
    case SyntaxKind.StringKeyword:
      return { type: 'string' };
    case SyntaxKind.NumberKeyword:
      return { type: 'number' };
    case SyntaxKind.BooleanKeyword:
      return { type: 'boolean' };
    case SyntaxKind.UnknownKeyword:
      return {};
    default:
      break;
  }

  if (!Node.isTypeReference(node)) {
    throw new Error(`openapi: cannot map type '${node.getText()}'`);
  }

  const name = node.getTypeName().getText();
  const typeArguments = node.getTypeArguments();

  switch (name) {
    case 'OpenUnion': {
      const known = typeArguments[0];
      const literals = Node.isUnionTypeNode(known)
        ? known.getTypeNodes()
        : [known];
      return {
        type: 'string',
        description: `Known values: ${literals.map(literalText).join(', ')}. Others may appear.`,
      };
    }
    case 'Record':
      return typeArguments[1].getKind() === SyntaxKind.NeverKeyword
        ? { type: 'object', maxProperties: 0 }
        : {
            type: 'object',
            additionalProperties: typeToSchema(typeArguments[1], source),
          };
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

  const declaration = referencedDeclaration(node);

  if (Node.isTypeAliasDeclaration(declaration)) {
    const alias = source.aliases.get(declaration.getName());
    if (alias === declaration) {
      return typeToSchema(alias.getTypeNodeOrThrow(), source);
    }
  }

  if (
    Node.isInterfaceDeclaration(declaration) &&
    source.interfaces.get(declaration.getName()) === declaration
  ) {
    return { $ref: `#/components/schemas/${declaration.getName()}` };
  }

  throw new Error(`openapi: cannot map type '${node.getText()}'`);
}

/** A field's one-line JSDoc, without the comment markers. */
function descriptionOf(node: Node): string | undefined {
  if (!Node.isJSDocable(node)) {
    return undefined;
  }
  const doc = node.getJsDocs().at(-1);
  return doc
    ?.getText()
    .replace(/^\/\*\*\s*|\s*\*\/$/g, '')
    .replace(/\s*\n\s*\*\s?/g, ' ');
}

function interfaceSchema(
  declaration: InterfaceDeclaration,
  source: TypeSource,
): Schema {
  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  for (const property of declaration.getProperties()) {
    const name = property.getName().replace(/'/g, '');
    const schema = typeToSchema(property.getTypeNodeOrThrow(), source);
    const description = descriptionOf(property);

    if (description && !('$ref' in schema)) {
      schema.description = schema.description
        ? `${description} ${schema.description}`
        : description;
    }

    properties[name] = schema;

    if (!property.hasQuestionToken()) {
      required.push(name);
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
  'TeamComparison',
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
  Scoreboard: {
    description: 'Every game in the week around a date, grouped by date.',
    schema: ref('Scoreboard'),
  },
  WscPlayByPlay: {
    description: 'Every event of a game as flat plays.',
    schema: arrayOf('WscPlay'),
  },
  PlayReplay: {
    description: 'Replay card for one play-by-play event.',
    schema: ref('PlayReplay'),
  },
  GameMeta: {
    description: 'Teams, season state and game state for a game.',
    schema: ref('GameMeta'),
  },
  PlayoffSeriesMeta: {
    description: 'Round title and seeded teams of a playoff series.',
    schema: ref('PlayoffSeriesMeta'),
  },
  TvSchedule: {
    description: 'National TV broadcasts for a week.',
    schema: ref('TvSchedule'),
  },
  PartnerGameOdds: {
    description: "Betting odds for today's games.",
    schema: ref('PartnerGameOdds'),
  },
  SeasonIds: {
    description: 'Every season id in YYYYYYYY format, oldest first.',
    schema: { type: 'array', items: { type: 'integer' } },
  },
  Meta: {
    description: 'Display metadata for players and teams.',
    schema: ref('Meta'),
  },
  GeoLocation: {
    description: "The caller's country.",
    schema: ref('GeoLocation'),
  },
  PostalLookup: {
    description: 'Teams whose broadcast market covers a postal code.',
    schema: arrayOf('PostalLookupTeam'),
  },
  DraftRankings: {
    description: 'Central Scouting rankings for one prospect category.',
    schema: ref('DraftRankings'),
  },
  DraftTracker: {
    description: 'Live draft tracker for the current draft.',
    schema: ref('DraftTracker'),
  },
  DraftPicks: {
    description: 'Picks of a draft, for one round or every round.',
    schema: ref('DraftPicks'),
  },
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
  SkaterDistanceTop10: {
    description: 'Top 10 skaters by skating distance.',
    schema: arrayOf('SkaterDistanceTop10Row'),
  },
  SkaterSpeedTop10: {
    description: 'Top 10 skaters by skating speed.',
    schema: arrayOf('SkaterSpeedTop10Row'),
  },
  SkaterZoneTimeTop10: {
    description: 'Top 10 skaters by zone time.',
    schema: arrayOf('SkaterZoneTimeTop10Row'),
  },
  SkaterShotSpeedTop10: {
    description: 'Top 10 skaters by shot speed.',
    schema: arrayOf('SkaterShotSpeedTop10Row'),
  },
  SkaterShotLocationTop10: {
    description: 'Top 10 skaters by shot location.',
    schema: arrayOf('SkaterShotLocationTop10Row'),
  },
  Goalie5v5Top10: {
    description: 'Top 10 goalies by 5v5 performance.',
    schema: arrayOf('Goalie5v5Top10Row'),
  },
  GoalieShotLocationTop10: {
    description: 'Top 10 goalies by shot location.',
    schema: arrayOf('GoalieShotLocationTop10Row'),
  },
  GoalieSavePercentageTop10: {
    description: 'Top 10 goalies by games above a .900 save percentage.',
    schema: arrayOf('GoalieSavePercentageTop10Row'),
  },
  TeamSkatingDistanceTop10: {
    description: 'Top 10 teams by skating distance.',
    schema: arrayOf('TeamSkatingDistanceTop10Row'),
  },
  TeamSkatingSpeedTop10: {
    description: 'Top 10 teams by skating speed.',
    schema: arrayOf('TeamSkatingSpeedTop10Row'),
  },
  TeamZoneTimeTop10: {
    description: 'Top 10 teams by zone time.',
    schema: arrayOf('TeamZoneTimeTop10Row'),
  },
  TeamShotSpeedTop10: {
    description: 'Top 10 teams by shot speed.',
    schema: arrayOf('TeamShotSpeedTop10Row'),
  },
  TeamShotLocationTop10: {
    description: 'Top 10 teams by shot location.',
    schema: arrayOf('TeamShotLocationTop10Row'),
  },
  ByTheNumbers: {
    description: 'League-wide EDGE highlights.',
    schema: ref('ByTheNumbers'),
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
  PlayerSearch: {
    description: 'Players matching a filter, at most 5 per page.',
    schema: page('StatsPlayer'),
  },
  SkaterLeaders: {
    description:
      'Top 10 single-season skater records; the stat key is `attribute`.',
    schema: {
      type: 'object',
      required: ['data', 'total'],
      properties: {
        data: {
          type: 'array',
          items: oneOf([
            'SkaterPointsLeaderRow',
            'SkaterGoalsLeaderRow',
            'SkaterAssistsLeaderRow',
            'SkaterGamesPlayedLeaderRow',
          ]),
        },
        total: { type: 'integer' },
      },
    },
  },
  GoalieLeaders: {
    description:
      'Top 10 single-season goalie records; the stat key is `attribute`.',
    schema: {
      type: 'object',
      required: ['data', 'total'],
      properties: {
        data: {
          type: 'array',
          items: oneOf([
            'GoalieGaaLeaderRow',
            'GoalieSavePctgLeaderRow',
            'GoalieShutoutsLeaderRow',
            'GoalieTimeOnIceLeaderRow',
            'GoalieGamesPlayedLeaderRow',
          ]),
        },
        total: { type: 'integer' },
      },
    },
  },
  SkaterMilestones: {
    description: 'Career milestones active skaters are approaching.',
    schema: page('SkaterMilestone'),
  },
  GoalieMilestones: {
    description: 'Career milestones active goalies are approaching.',
    schema: page('GoalieMilestone'),
  },
  StatsTeams: { description: 'Stats API teams.', schema: page('StatsTeam') },
  ComponentSeasons: {
    description: 'Default season and game type of the stats API.',
    schema: page('ComponentSeason'),
  },
  StatsGames: { description: 'Games.', schema: page('StatsGame') },
  Ping: {
    description: 'Empty object; the stats API is up.',
    schema: { type: 'object' },
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
  const source = loadDeclarations();
  const schemas: Record<string, Schema> = {};

  for (const [name, declaration] of [...source.interfaces].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    schemas[name] = interfaceSchema(declaration, source);
  }

  // `Play` is a union over the PlayTypes registry.
  const playTypes = source.interfaces.get('PlayTypes');
  if (playTypes) {
    delete schemas.PlayTypes;
    schemas.Play = {
      oneOf: playTypes
        .getProperties()
        .map((property) => ref(property.getTypeNodeOrThrow().getText())),
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
