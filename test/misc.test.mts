import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('Misc', () => {
  const cases = [
    ['glossary', 'stats/rest/en/glossary?sort=fullName'],
    ['countries', 'stats/rest/en/country'],
    ['seasonSpecificRulesAndInfo', 'stats/rest/en/season'],
    ['draftYearAndRounds', 'stats/rest/en/draft'],
  ] as const;

  for (const [method, resource] of cases) {
    it(`${method} unwraps data`, async () => {
      const fetchSpy = mockFetch(() => ({ body: { data: [{ id: 1 }] } }));
      assert.deepEqual(await newClient().misc[method](), [{ id: 1 }]);
      assert.deepEqual(calledUrls(fetchSpy), [
        `https://api.nhle.com/${resource}`,
      ]);
    });
  }

  it('config returns the full payload', async () => {
    const fetchSpy = mockFetch(() => ({ body: { playerReportData: {} } }));
    assert.deepEqual(await newClient().misc.config(), { playerReportData: {} });
    assert.deepEqual(calledUrls(fetchSpy), [
      'https://api.nhle.com/stats/rest/en/config',
    ]);
  });
});
