#!/usr/bin/env node
import { runCli } from '#src/cli/run.mjs';

// Exit quietly when the reader goes away (e.g. `nhl-api-ts ... | head`).
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') {
    process.exit(0);
  }
  throw err;
});

process.exitCode = await runCli(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
});
