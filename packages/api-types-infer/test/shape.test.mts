import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeSnapshots,
  normalizeSnapshot,
  type Snapshot,
} from '#src/shape.mjs';

const addOnly = { overwrite: false };
const overwrite = { overwrite: true };

/** Merges in `options` and asserts the result is already normalized. */
function mergeBoth(base: Snapshot, next: Snapshot) {
  const results = {
    addOnly: mergeSnapshots(base, next, addOnly),
    overwrite: mergeSnapshots(base, next, overwrite),
  };
  for (const result of Object.values(results)) {
    assert.deepEqual(
      Object.entries(normalizeSnapshot(result)),
      Object.entries(result),
    );
  }
  return results;
}

describe('mergeSnapshots: values in both', () => {
  it('keeps the base when next is a subset', () => {
    const { addOnly, overwrite } = mergeBoth(
      { $: 'object', '.v': 'float|integer' },
      { $: 'object', '.v': 'float' },
    );
    assert.equal(addOnly['.v'], 'float|integer');
    assert.equal(overwrite['.v'], 'float|integer');
  });

  it('widens to next when it only adds kinds or a ?', () => {
    const { addOnly } = mergeBoth(
      { $: 'object', '.v': 'float', '.s': 'string' },
      { $: 'object', '.v': 'float|integer', '.s': 'string?' },
    );
    assert.equal(addOnly['.v'], 'float|integer');
    assert.equal(addOnly['.s'], 'string?');
  });

  it('keeps the base on adds-and-drops in add-only, takes next in overwrite', () => {
    const { addOnly, overwrite } = mergeBoth(
      { $: 'object', '.a': 'string' },
      { $: 'object', '.a': 'integer' },
    );
    assert.equal(addOnly['.a'], 'string');
    assert.equal(overwrite['.a'], 'integer');
  });

  it('overwrite keeps accepted widenings', () => {
    const merged = mergeSnapshots(
      { $: 'object', '.a': 'string?', '.v': 'float|integer' },
      { $: 'object', '.a': 'string', '.v': 'float' },
      overwrite,
    );
    assert.deepEqual(merged, {
      $: 'object',
      '.a': 'string?',
      '.v': 'float|integer',
    });
  });

  it('takes next over an always-empty array base in both modes', () => {
    const base = { $: 'object', '.x': 'array', '.x[]': '' };
    const next = {
      $: 'object',
      '.x': 'array',
      '.x[]': 'object',
      '.x[].y': 'string',
    };
    const { addOnly, overwrite } = mergeBoth(base, next);
    assert.deepEqual(addOnly, next);
    assert.deepEqual(overwrite, next);
  });
});

describe('mergeSnapshots: paths on one side', () => {
  it('keeps base-only paths in snapshot() order', () => {
    const merged = mergeSnapshots(
      { $: 'object', '.b': 'string', '.list': 'array', '.list[]': 'integer' },
      { $: 'object', '.a': 'string', '.b': 'string', '.list': 'array' },
      addOnly,
    );
    assert.deepEqual(Object.keys(merged), [
      '$',
      '.a',
      '.b',
      '.list',
      '.list[]',
    ]);
    assert.equal(merged['.a'], 'string?');
  });

  it('marks the top of an added subtree optional; descendants keep their markers', () => {
    const merged = mergeSnapshots(
      { $: 'object', '.p': 'object' },
      {
        $: 'object',
        '.p': 'object',
        '.p.c': 'object',
        '.p.c.d': 'string',
        '.p.c.e': 'string?',
      },
      addOnly,
    );
    assert.equal(merged['.p.c'], 'object?');
    assert.equal(merged['.p.c.d'], 'string');
    assert.equal(merged['.p.c.e'], 'string?');
  });

  it('overwrite marks a kept base-only path optional when its parent is in next', () => {
    const merged = mergeSnapshots(
      { $: 'object', '.p': 'object', '.p.c': 'string' },
      { $: 'object', '.p': 'object' },
      overwrite,
    );
    assert.equal(merged['.p.c'], 'string?');
  });

  it('skips a child under a base path that lacks the kind it needs', () => {
    const { addOnly } = mergeBoth(
      { $: 'object', '.x': 'string' },
      { $: 'object', '.x': 'null|object', '.x.y': 'string' },
    );
    assert.deepEqual(addOnly, { $: 'object', '.x': 'string' });
  });

  it('adds [] items without ? when the parent only gained array', () => {
    const { addOnly } = mergeBoth(
      { $: 'object', '.x': 'object', '.x.y': 'string' },
      { $: 'object', '.x': 'array|object', '.x.y': 'string', '.x[]': 'object' },
    );
    assert.equal(addOnly['.x'], 'array|object');
    assert.equal(addOnly['.x[]'], 'object');
  });
});

describe('mergeSnapshots: type changes never orphan children', () => {
  it('overwrite keeps array items when next came back empty', () => {
    const merged = mergeSnapshots(
      {
        $: 'object',
        '.x': 'array',
        '.x[]': 'object',
        '.x[].y': 'string',
        '.x[].z': 'string?',
      },
      { $: 'object', '.x': 'array', '.x[]': '' },
      overwrite,
    );
    assert.equal(merged['.x[]'], 'object');
    assert.equal(merged['.x[].y'], 'string');
    assert.deepEqual(normalizeSnapshot(merged), merged);
  });

  it('object -> array', () => {
    const { addOnly, overwrite } = mergeBoth(
      { $: 'object', '.x': 'object', '.x.y': 'string' },
      { $: 'object', '.x': 'array', '.x[]': 'object' },
    );
    const expected = { $: 'object', '.x': 'object', '.x.y': 'string' };
    assert.deepEqual(addOnly, expected);
    assert.deepEqual(overwrite, expected);
  });

  it('array -> object', () => {
    const { addOnly, overwrite } = mergeBoth(
      { $: 'object', '.x': 'array', '.x[]': 'object' },
      { $: 'object', '.x': 'object', '.x.y': 'string' },
    );
    const expected = { $: 'object', '.x': 'array', '.x[]': 'object' };
    assert.deepEqual(addOnly, expected);
    assert.deepEqual(overwrite, expected);
  });
});
