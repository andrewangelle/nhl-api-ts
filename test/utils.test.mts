import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pyJsonDumps } from '#src/index.mjs';

describe('pyJsonDumps', () => {
  it("matches Python's json.dumps output", () => {
    assert.equal(
      pyJsonDumps([{ property: 'points', direction: 'DESC' }]),
      '[{"property": "points", "direction": "DESC"}]',
    );
    assert.equal(pyJsonDumps([{}]), '[{}]');
    assert.equal(
      pyJsonDumps({ a: [1, true, null], b: 'é"' }),
      '{"a": [1, true, null], "b": "\\u00e9\\""}',
    );
  });
});
