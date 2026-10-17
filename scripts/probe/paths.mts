import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

export const PROBE_DIR = `${root}.probe`;
export const RAW_DIR = `${PROBE_DIR}/raw`;
export const REPORT_DIR = `${PROBE_DIR}/report`;
export const DRAFT_DIR = `${PROBE_DIR}/draft`;
export const SHAPES_DIR = `${root}scripts/probe/shapes`;

export const slug = (tags: Record<string, string>): string => {
  const joined = Object.entries(tags)
    .map(([key, value]) => `${key}-${value}`)
    .join('_');
  return (joined || 'default').replace(/[^A-Za-z0-9_.-]+/g, '-');
};
