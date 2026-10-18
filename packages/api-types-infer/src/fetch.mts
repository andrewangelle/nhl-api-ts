/**
 * Runs the sample matrix against the live NHL APIs and caches every raw
 * response under `.api-types/raw/<endpoint>/<tag-slug>.json`.
 *
 *   pnpm api-types:fetch [--refresh] [--out <dir>] [--only <endpoint-prefix>]
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createNHLClient } from 'nhl-api-ts';
import { RAW_DIR, slug } from '#src/paths.mjs';
import { buildSamples } from '#src/samples.mjs';

const DELAY_MS = 250;

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');

function optionValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const outDir = optionValue('--out') ?? RAW_DIR;
const only = optionValue('--only');

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Capture {
  url: string;
  status: number;
  body: unknown;
}

export async function runFetch(
  targetDir: string,
  options: { refresh: boolean; only?: string },
): Promise<{ fetched: number; cached: number; failed: number }> {
  const samples = await buildSamples();
  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (const sample of samples) {
    if (options.only && !sample.endpoint.startsWith(options.only)) {
      continue;
    }
    const dir = `${targetDir}/${sample.endpoint}`;
    const file = `${dir}/${slug(sample.tags)}.json`;

    if (!options.refresh && existsSync(file)) {
      cached += 1;
      continue;
    }

    let capture: Capture | undefined;
    const client = createNHLClient({
      timeout: 60,
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        const text = await response.clone().text();
        let body: unknown = text;
        try {
          body = JSON.parse(text);
        } catch {
          // keep the raw text
        }
        capture = { url: String(input), status: response.status, body };
        return response;
      },
    });

    try {
      await sample.call(client);
    } catch (error) {
      console.error(
        `  ! ${sample.endpoint} ${JSON.stringify(sample.tags)}: ${(error as Error).message}`,
      );
    }

    await mkdir(dir, { recursive: true });

    if (capture) {
      await writeFile(
        file,
        JSON.stringify({ tags: sample.tags, ...capture }, null, 1),
      );
      if (capture.status >= 400) {
        failed += 1;
      }
      fetched += 1;
      console.error(
        `  ${capture.status} ${sample.endpoint} ${slug(sample.tags)}`,
      );
    }

    await wait(DELAY_MS);
  }

  return { fetched, cached, failed };
}

if (import.meta.main) {
  const result = await runFetch(outDir, { refresh, only });
  console.error(JSON.stringify(result));
}
