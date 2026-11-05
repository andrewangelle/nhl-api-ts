/**
 * Runs the sample matrix against the live NHL APIs and caches every raw
 * response under `.api-types/raw/<endpoint>/<tag-slug>.json`.
 *
 *   pnpm api-types:fetch [--refresh] [--out <dir>] [--only <endpoint-prefix>...]
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createNHLClient } from 'nhl-api-ts';
import { RAW_DIR, slug } from '#src/paths.mjs';
import { buildSamples, type Sample } from '#src/samples.mjs';

const DELAY_MS = 500;
const MAX_RETRIES = 3;
const BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 60_000;

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');

function optionValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/** Every value after `name` up to the next flag, e.g. `--only players misc edge`. */
function optionValues(name: string): string[] | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const next = args.findIndex(
    (arg, position) => position > index && arg.startsWith('--'),
  );
  return args.slice(index + 1, next === -1 ? undefined : next);
}

const outDir = optionValue('--out') ?? RAW_DIR;
const only = optionValues('--only');

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Capture {
  url: string;
  status: number;
  body: unknown;
}

interface Attempt {
  capture?: Capture;
  retryAfter: string | null;
  error?: Error;
}

/** Runs one sample with a fresh client, so each attempt gets its own timeout. */
async function attempt(sample: Sample): Promise<Attempt> {
  const result: Attempt = { retryAfter: null };
  const client = createNHLClient({
    timeout: 60,
    fetch: async (input, init) => {
      const response = await globalThis.fetch(input, init);
      // Read the body once and hand the SDK a fresh Response. Returning the
      // original after reading a clone() intermittently fails with "Body is
      // unusable: Body has already been read".
      const text = await response.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep the raw text
      }
      result.capture = { url: String(input), status: response.status, body };
      result.retryAfter = response.headers.get('retry-after');
      const nullBody = [101, 204, 205, 304].includes(response.status);
      return new Response(nullBody ? null : text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
  });

  try {
    await sample.call(client);
  } catch (error) {
    result.error = error as Error;
  }
  return result;
}

/** Milliseconds to wait before retry `retry` (1-based): Retry-After if sent, else exponential. */
export function backoffMs(retryAfter: string | null, retry: number): number {
  const seconds = Number(retryAfter);
  let ms = BACKOFF_MS * 2 ** (retry - 1);
  if (
    retryAfter !== null &&
    retryAfter.trim() !== '' &&
    Number.isFinite(seconds)
  ) {
    ms = seconds * 1000;
  } else if (retryAfter !== null) {
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) {
      ms = date - Date.now();
    }
  }
  return Math.min(Math.max(ms, 0), MAX_BACKOFF_MS);
}

export async function runFetch(
  targetDir: string,
  options: { refresh: boolean; only?: readonly string[] },
): Promise<{ fetched: number; cached: number; failed: number }> {
  const samples = await buildSamples();
  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (const sample of samples) {
    if (
      options.only &&
      !options.only.some((prefix) => sample.endpoint.startsWith(prefix))
    ) {
      continue;
    }
    const dir = `${targetDir}/${sample.endpoint}`;
    const file = `${dir}/${slug(sample.tags)}.json`;

    if (!options.refresh && existsSync(file)) {
      cached += 1;
      continue;
    }

    let result = await attempt(sample);
    for (let retry = 1; retry <= MAX_RETRIES; retry += 1) {
      if (result.capture?.status !== 429) {
        break;
      }
      const ms = backoffMs(result.retryAfter, retry);
      console.error(
        `  429 ${sample.endpoint} ${slug(sample.tags)}: retry ${retry}/${MAX_RETRIES} in ${Math.round(ms / 1000)}s`,
      );
      await wait(ms);
      result = await attempt(sample);
    }

    if (result.error) {
      console.error(
        `  ! ${sample.endpoint} ${JSON.stringify(sample.tags)}: ${result.error.message}`,
      );
    }

    await mkdir(dir, { recursive: true });

    const { capture } = result;
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
  if (only?.length === 0) {
    console.error(
      'usage: api-types:fetch [--refresh] [--out <dir>] [--only <endpoint-prefix>...]',
    );
    process.exit(2);
  }
  const result = await runFetch(outDir, { refresh, only });
  console.error(JSON.stringify(result));
}
