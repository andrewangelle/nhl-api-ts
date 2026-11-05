import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  diffSnapshots,
  isTransientFailure,
  summarize,
  summarizeSkipped,
} from '#src/check.mjs';
import { backoffMs } from '#src/fetch.mjs';
import type { RawSample } from '#src/load.mjs';

function sample(status: number): RawSample {
  return { tags: {}, url: 'https://example.test', status, body: null };
}

describe('check', () => {
  it('treats only rate limits and server errors as transient', () => {
    assert.equal(isTransientFailure(sample(429)), true);
    assert.equal(isTransientFailure(sample(503)), true);
    assert.equal(isTransientFailure(sample(404)), false);
    assert.equal(isTransientFailure(sample(200)), false);
  });

  it('summarizes diff lines as +N -N ~N, omitting zero counts', () => {
    const lines = diffSnapshots(
      'team',
      { $: 'object', '.a': 'string', '.b': 'integer', '.c': 'string' },
      { $: 'object', '.a': 'string?', '.d': 'string', '.e': 'string' },
    );

    assert.equal(summarize(lines), '+2 -2 ~1');
    assert.equal(summarize(lines.filter((line) => line[0] === '+')), '+2');
  });

  it('groups skipped shapes by module', () => {
    const skipped = new Map([
      ['stats.clubStats', '5/5 samples failed'],
      ['stats.goalieLeaders.gaa', '2/2 samples failed'],
      ['teams.teamRoster', '8/8 samples failed'],
    ]);

    assert.deepEqual(summarizeSkipped(skipped), [
      '  stats  2 shape(s)',
      '  teams  1 shape(s)',
    ]);
  });
});

describe('backoffMs', () => {
  it('uses Retry-After seconds when sent', () => {
    assert.equal(backoffMs('7', 1), 7_000);
  });

  it('backs off exponentially without Retry-After', () => {
    assert.equal(backoffMs(null, 1), 5_000);
    assert.equal(backoffMs(null, 2), 10_000);
    assert.equal(backoffMs('', 3), 20_000);
  });

  it('caps the wait at a minute', () => {
    assert.equal(backoffMs('3600', 1), 60_000);
  });

  it('reads an HTTP-date Retry-After', () => {
    const inTenSeconds = new Date(Date.now() + 10_000).toUTCString();
    const ms = backoffMs(inTenSeconds, 1);
    assert.ok(ms > 8_000 && ms <= 10_000, `got ${ms}`);
  });
});
