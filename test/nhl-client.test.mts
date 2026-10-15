import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { errorForStatus } from '#src/http-client.mjs';
import {
  BadRequestException,
  createGet,
  createNHLClient,
  Endpoint,
  NHLApiErrorCode,
  NHLApiException,
  RateLimitExceededException,
  ResourceNotFoundException,
  resolveConfig,
  ServerErrorException,
  UnauthorizedException,
} from '#src/index.mjs';

describe('NHLClient', () => {
  it('exposes the API modules', () => {
    const client = createNHLClient();
    for (const key of [
      'teams',
      'standings',
      'schedule',
      'gameCenter',
      'stats',
      'misc',
      'helpers',
      'players',
      'edge',
    ] as const) {
      assert.ok(client[key]);
      for (const fn of Object.values(client[key])) {
        assert.equal(typeof fn, 'function');
      }
    }
  });

  it('applies config defaults', () => {
    const client = createNHLClient();
    assert.equal(client.config.debug, false);
    assert.equal(client.config.timeout, 10);
    assert.equal(client.config.followRedirects, true);
  });
});

describe('errorForStatus', () => {
  const cases = [
    [404, ResourceNotFoundException, NHLApiErrorCode.RESOURCE_NOT_FOUND],
    [429, RateLimitExceededException, NHLApiErrorCode.RATE_LIMIT_EXCEEDED],
    [400, BadRequestException, NHLApiErrorCode.BAD_REQUEST],
    [401, UnauthorizedException, NHLApiErrorCode.UNAUTHORIZED],
    [500, ServerErrorException, NHLApiErrorCode.SERVER_ERROR],
    [502, ServerErrorException, NHLApiErrorCode.SERVER_ERROR],
    [418, NHLApiException, undefined],
  ] as const;

  for (const [status, ErrorClass, code] of cases) {
    it(`maps HTTP ${status} to ${ErrorClass.name}`, () => {
      const err = errorForStatus(status, 'Test error message');
      assert.ok(err instanceof ErrorClass);
      assert.ok(err instanceof NHLApiException);
      assert.equal(err.statusCode, status);
      assert.equal(err.errorCode, code);
      assert.match(err.message, /Test error message/);
    });
  }

  it('prefixes unexpected statuses with "Unexpected error"', () => {
    const err = errorForStatus(418, 'Request to x failed: teapot');
    assert.equal(err.message, 'Unexpected error: Request to x failed: teapot');
  });
});

describe('createGet', () => {
  const jsonResponse = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  it('returns the response on success', async () => {
    const fakeFetch = async () => jsonResponse(200, { data: 'test' });
    const get = createGet(resolveConfig({ fetch: fakeFetch }));
    const response = await get(Endpoint.API_CORE, '/test');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: 'test' });
  });

  it('handles non-JSON error bodies', async () => {
    const fakeFetch = async () => new Response('oops <html>', { status: 500 });
    const get = createGet(resolveConfig({ fetch: fakeFetch }));
    await assert.rejects(get(Endpoint.API_CORE, 'test'), (err) => {
      assert.ok(err instanceof ServerErrorException);
      assert.equal(err.statusCode, 500);
      assert.equal(err.message, 'Request to test failed');
      return true;
    });
  });

  it('maps error status with a JSON message body', async () => {
    const fakeFetch = async () =>
      jsonResponse(404, { message: 'Test error message' });
    const get = createGet(resolveConfig({ fetch: fakeFetch }));
    await assert.rejects(get(Endpoint.API_CORE, '/test'), (err) => {
      assert.ok(err instanceof ResourceNotFoundException);
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Test error message/);
      return true;
    });
  });

  it('encodes query params like httpx', async () => {
    const calls: string[] = [];
    const fakeFetch = async (input: string | URL | Request) => {
      calls.push(String(input));
      return jsonResponse(200, {});
    };
    const get = createGet(resolveConfig({ fetch: fakeFetch }));
    await get(Endpoint.API_CORE, 'test', {
      season: '20232024',
      isAggregate: false,
      limit: 25,
      empty: null,
    });
    assert.deepEqual(calls, [
      'https://api.nhle.com/test?season=20232024&isAggregate=false&limit=25&empty=',
    ]);
  });

  it('passes redirect mode and a timeout signal to fetch', async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return jsonResponse(200, {});
    };
    const get = createGet(
      resolveConfig({ fetch: fakeFetch, followRedirects: false }),
    );
    await get(Endpoint.API_WEB_V1, 'score/now');
    assert.equal(capturedInit?.redirect, 'manual');
    assert.ok(capturedInit?.signal instanceof AbortSignal);
  });
});
