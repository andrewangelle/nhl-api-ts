import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { ProspectCategory } from '#src/index.mjs';
import { calledUrls, mockFetch, newClient } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('Draft', () => {
  const cases: [
    string,
    (client: ReturnType<typeof newClient>) => Promise<unknown>,
    string,
  ][] = [
    [
      'rankings defaults to now',
      (client) => client.draft.rankings(),
      'draft/rankings/now',
    ],
    [
      'rankings ignores category without a season',
      (client) =>
        client.draft.rankings({
          category: ProspectCategory.INTERNATIONAL_GOALIE,
        }),
      'draft/rankings/now',
    ],
    [
      'rankings defaults category to 1 with a season',
      (client) => client.draft.rankings({ season: 2023 }),
      'draft/rankings/2023/1',
    ],
    [
      'rankings with season and category',
      (client) =>
        client.draft.rankings({
          season: 2023,
          category: ProspectCategory.NORTH_AMERICAN_GOALIE,
        }),
      'draft/rankings/2023/3',
    ],
    ['tracker', (client) => client.draft.tracker(), 'draft-tracker/picks/now'],
    [
      'picks defaults to now',
      (client) => client.draft.picks(),
      'draft/picks/now',
    ],
    [
      'picks defaults round to all with a season',
      (client) => client.draft.picks({ season: 2023 }),
      'draft/picks/2023/all',
    ],
    [
      'picks with season and round',
      (client) => client.draft.picks({ season: '2023', round: 7 }),
      'draft/picks/2023/7',
    ],
  ];

  for (const [name, call, resource] of cases) {
    it(name, async () => {
      const fetchSpy = mockFetch();
      await call(newClient());
      assert.deepEqual(calledUrls(fetchSpy), [
        `https://api-web.nhle.com/v1/${resource}`,
      ]);
    });
  }

  it('rankings rejects a category outside 1-4', async () => {
    const fetchSpy = mockFetch();
    for (const category of [0, 5, 1.5]) {
      await assert.rejects(
        newClient().draft.rankings({
          season: 2023,
          category: category as ProspectCategory,
        }),
        RangeError,
      );
    }
    assert.equal(fetchSpy.mock.callCount(), 0);
  });

  it('picks rejects a round outside 1-7', async () => {
    const fetchSpy = mockFetch();
    for (const round of [0, 8, 'first']) {
      await assert.rejects(
        newClient().draft.picks({
          season: 2023,
          round: round as unknown as 1,
        }),
        RangeError,
      );
    }
    assert.equal(fetchSpy.mock.callCount(), 0);
  });
});
