import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { load } from 'js-yaml';
import { applyBlocks, generatedBlocks } from '#src/openapi.mjs';
import { SDK_DIR } from '#src/paths.mjs';
import {
  componentPointers,
  reachableFromPaths,
  refsIn,
  resolve,
} from './openapi.utils.mts';

describe('openapi.yaml', () => {
  const current = readFileSync(`${SDK_DIR}openapi.yaml`, 'utf8');

  it('generated schemas and responses match src/types', () => {
    assert.equal(
      applyBlocks(current, generatedBlocks()),
      current,
      'openapi.yaml is stale. Run `pnpm openapi:schemas`.',
    );
  });

  // Starts from the $refs under paths and keeps following refs until there are none left.
  // Then lists every entry under components that was never reached: schemas, responses and parameters.
  // A schema that only an unused schema points to also fails.
  // If it does fail, the message says to reference the component from a path or remove it.
  // For a generated schema that isn't an API payload, it says to add the type to SKIPPED in src/openapi.mts.

  it('every $ref resolves to a node in the document', () => {
    const document = load(current);
    const refs = refsIn(document);
    assert.ok(refs.length > 0, 'openapi.yaml has no $refs');

    const unresolved = [
      ...new Set(refs.filter((ref) => !resolve(document, ref))),
    ];
    assert.deepEqual(unresolved, [], 'openapi.yaml has unresolved $refs');
  });

  it('every component is reachable from a path', () => {
    const document = load(current) as Record<string, unknown>;
    const reached = reachableFromPaths(document);

    const unused = componentPointers(document).filter(
      (pointer) => !reached.has(pointer),
    );
    assert.deepEqual(
      unused,
      [],
      'openapi.yaml has components no path uses. Reference them from a path, or remove them (for a generated schema, add the type to SKIPPED in src/openapi.mts if it is not an API payload).',
    );
  });
});
