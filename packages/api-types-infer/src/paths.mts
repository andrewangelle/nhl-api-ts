import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Root of the nhl-api-ts package, resolved through the workspace dependency. */
export const SDK_DIR = fileURLToPath(
  new URL('./', import.meta.resolve('nhl-api-ts/package.json')),
);

export const CACHE_DIR = `${root}.api-types`;
export const RAW_DIR = `${CACHE_DIR}/raw`;
export const REPORT_DIR = `${CACHE_DIR}/report`;
export const DRAFT_DIR = `${CACHE_DIR}/draft`;
export const SHAPES_DIR = `${root}shapes`;

export function slug(tags: Record<string, string>): string {
  const joined = Object.entries(tags)
    .map(([key, value]) => `${key}-${value}`)
    .join('_');
  return (joined || 'default').replace(/[^A-Za-z0-9_.-]+/g, '-');
}
