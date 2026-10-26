import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { after, describe, it } from 'node:test';
import { draftDirFor, writeDrafts } from '#src/conform.mjs';
import { draftFor, inferAll } from '#src/infer.mjs';
import { slug } from '#src/paths.mjs';
import type { ShapeNode } from '#src/shape.mjs';

const root = mkdtempSync(`${tmpdir()}/drafts-test-`);
const raw = `${root}/raw`;

function writeSample(
  endpoint: string,
  tags: Record<string, string>,
  body: unknown,
) {
  mkdirSync(`${raw}/${endpoint}`, { recursive: true });
  writeFileSync(
    `${raw}/${endpoint}/${slug(tags)}.json`,
    JSON.stringify({ tags, url: 'https://example.test', status: 200, body }),
  );
}

writeSample(
  'teams.teamRoster',
  { team: 'BUF' },
  {
    forwards: [{ id: 1, firstName: { default: 'A' } }],
  },
);
for (const reportType of ['summary', 'realtime']) {
  writeSample(
    'stats.skaterStatsWithQueryContext',
    { reportType },
    { data: [{ playerId: 1, [reportType]: 2 }], total: 1 },
  );
}

after(() => rmSync(root, { recursive: true, force: true }));

describe('drafts', () => {
  it('conform writes the same drafts infer does, beside the raw dir', () => {
    writeDrafts(raw);
    const draftDir = draftDirFor(raw);
    assert.equal(draftDir, `${root}/draft`);

    const shapes = inferAll(raw);
    assert.deepEqual(
      readdirSync(draftDir).sort(),
      [...shapes.keys()].map((group) => `${group}.mts`).sort(),
    );
    for (const [group, shape] of shapes) {
      assert.equal(
        readFileSync(`${draftDir}/${group}.mts`, 'utf8'),
        draftFor(group, shape),
      );
    }
  });

  it('names a grouped root after its group', () => {
    const shapes = inferAll(raw);
    const group = 'stats.skaterStatsWithQueryContext.summary';
    assert.match(
      draftFor(group, shapes.get(group) as ShapeNode),
      /^\/\/ root: SkaterRowSummary\n/,
    );
  });
});
