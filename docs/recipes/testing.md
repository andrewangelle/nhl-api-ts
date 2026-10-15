# Test code that uses the SDK

The SDK calls the global `fetch`, which it looks up on every request. Your
tests can replace it, so they don't need network access or a special client.

## node:test

```ts
import assert from 'node:assert/strict';
import { afterEach, it, mock } from 'node:test';
import { NHLClient } from 'nhl-api-ts';

afterEach(() => mock.restoreAll());

it('lists team abbreviations', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL) => {
    const url = String(input);
    const body = url.includes('/standings/')
      ? { standings: [{ teamAbbrev: { default: 'TOR' }, teamName: { default: 'Toronto Maple Leafs' } }] }
      : { data: [{ id: 5, fullName: 'Toronto Maple Leafs' }] };
    return Response.json(body);
  });

  const teams = await new NHLClient().teams.teams();

  assert.deepEqual(teams.map((team) => team.abbr), ['TOR']);
  assert.equal(teams[0].franchise_id, 5);
  assert.equal(String(fetchMock.mock.calls[0].arguments[0]), 'https://api-web.nhle.com/v1/standings/now');
});
```

## Vitest or Jest

```ts
vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));
```

## Simulating errors

Return a non-2xx `Response`. The SDK maps it to the matching exception:

```ts
mock.method(globalThis, 'fetch', async () =>
  Response.json({ message: 'nope' }, { status: 429 }),
);
await assert.rejects(
  new NHLClient().misc.countries(),
  { name: 'RateLimitExceededException', statusCode: 429 },
);
```

## Tips

- Assert on URLs. They are the stable contract. Response payloads are the
  NHL's and can change without notice.
- Record real responses once with `--debug` and a CLI call
  (`nhl-api-ts game-center boxscore 2023020280 > fixtures/boxscore.json`),
  then serve them from your mock.
- `client.helpers` methods sleep between teams. Pass `apiSleepRate: 0` in tests.
