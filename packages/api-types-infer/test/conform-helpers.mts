import { type ConformResult, Walker } from '#src/conformance.mjs';
import { Declarations } from '#src/declarations.mjs';
import { buildShape, type RawSample } from '#src/load.mjs';

export const COMMON = `
export type OpenUnion<Known extends string> = Known | (string & {});
export interface LocalizedString {
  default: string;
  cs?: string;
  fr?: string;
}
`;

/** One raw sample per body; each gets its own tag so it counts as an independent response. */
export function samples(...bodies: unknown[]): RawSample[] {
  return bodies.map((body, index) => ({
    tags: { sample: String(index) },
    url: `https://example.test/${index}`,
    status: 200,
    body,
  }));
}

export interface Run extends ConformResult {
  declarations: Declarations;
}

/**
 * Walks each group's samples against `root` from in-memory `types`
 * (a file's text, or files by name under `src/types/`).
 */
export function conform(
  types: string | Record<string, string>,
  root: string,
  groups: Record<string, RawSample[]>,
): Run {
  const declarations = Declarations.fromSource(types);
  const resolved = declarations.resolve([root]).get(root);
  if (!resolved?.type) {
    throw new Error(`${root} did not resolve: ${resolved?.error}`);
  }
  const walker = new Walker(declarations);
  for (const [group, groupSamples] of Object.entries(groups)) {
    walker.walkGroup(group, buildShape(groupSamples, undefined), resolved.type);
  }
  return { findings: walker.findings, usage: walker.usage, declarations };
}

export function conformOne(
  types: string | Record<string, string>,
  root: string,
  ...bodies: unknown[]
): Run {
  return conform(types, root, { 'test.group': samples(...bodies) });
}

export function errors(run: ConformResult) {
  return run.findings.filter((finding) => finding.severity === 'error');
}

export function summary(run: ConformResult): string[] {
  return run.findings.map((finding) => `${finding.kind} ${finding.path}`);
}
