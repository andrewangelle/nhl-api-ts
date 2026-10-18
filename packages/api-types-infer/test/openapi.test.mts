import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { applyBlocks, generatedBlocks } from '#src/openapi.mjs';
import { SDK_DIR } from '#src/paths.mjs';

describe('openapi.yaml', () => {
  it('generated schemas and responses match src/types', () => {
    const current = readFileSync(`${SDK_DIR}openapi.yaml`, 'utf8');
    assert.equal(
      applyBlocks(current, generatedBlocks()),
      current,
      'openapi.yaml is stale. Run `pnpm openapi:schemas`.',
    );
  });
});
