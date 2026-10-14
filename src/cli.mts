#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { colors, errorColors } from '#src/logging.mjs';

const USAGE = `
Usage: 
  nhl-api-ts ${colors.pass('<plan>')} [options]


Options:
  -h, --help        show this help message
`;

let parsed: {
  values: {
    help: boolean;
  };
  positionals: string[];
};

try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
} catch (err) {
  console.error(
    `${errorColors.error(`error: ${(err as Error).message}`)}\n${USAGE}`,
  );
  process.exit(2);
}
