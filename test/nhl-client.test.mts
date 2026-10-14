import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  BadRequestException,
  ClientConfig,
  Endpoint,
  HttpClient,
  NHLApiErrorCode,
  NHLApiException,
  NHLClient,
  RateLimitExceededException,
  ResourceNotFoundException,
  Schedule,
  ServerErrorException,
  Standings,
  Teams,
  UnauthorizedException,
} from '#src/index.mjs';
import { calledUrls, mockFetch } from './fetch-mock.mts';

afterEach(() => mock.restoreAll());

describe('NHLClient', () => {
  it('exposes the API modules', () => {
    const c = new NHLClient();
    assert.ok(c.teams instanceof Teams);
    assert.ok(c.standings instanceof Standings);
    assert.ok(c.schedule instanceof Schedule);
    for (const key of [
      'gameCenter',
      'stats',
      'misc',
      'helpers',
      'players',
      'edge',
    ] as const) {
      assert.ok(c[key]);
    }
  });

  it('applies config defaults', () => {
    const c = new NHLClient();
    assert.equal(c.config.debug, false);
    assert.equal(c.config.timeout, 10);
    assert.equal(c.config.sslVerify, true);
    assert.equal(c.config.followRedirects, true);
  });
});

describe('HttpClient', () => {
  const http = () => new HttpClient(new ClientConfig({ timeout: 30 }));

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
    it(`maps HTTP ${status} to ${ErrorClass.name}`, async () => {
      mockFetch(() => ({ status, body: { message: 'Test error message' } }));
      await assert.rejects(http().get(Endpoint.API_CORE, '/test'), (err) => {
        assert.ok(err instanceof ErrorClass);
        assert.ok(err instanceof NHLApiException);
        assert.equal(err.statusCode, status);
        assert.equal(err.errorCode, code);
        assert.match(err.message, /Test error message/);
        return true;
      });
    });
  }

  it('prefixes unexpected statuses with "Unexpected error"', async () => {
    mockFetch(() => ({ status: 418, body: { message: 'teapot' } }));
    await assert.rejects(http().get(Endpoint.API_CORE, 'x'), {
      message: 'Unexpected error: Request to x failed: teapot',
    });
  });

  it('returns the response on success', async () => {
    mockFetch(() => ({ body: { data: 'test' } }));
    const res = await http().get(Endpoint.API_CORE, '/test');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { data: 'test' });
  });

  it('handles non-JSON error bodies', async () => {
    mockFetch(() => ({ status: 500, body: 'oops <html>' }));
    await assert.rejects(http().get(Endpoint.API_CORE, 'test'), (err) => {
      assert.ok(err instanceof ServerErrorException);
      assert.equal(err.statusCode, 500);
      assert.equal(err.message, 'Request to test failed');
      return true;
    });
  });

  it('encodes query params like httpx', async () => {
    const f = mockFetch();
    await http().get(Endpoint.API_CORE, 'test', {
      season: '20232024',
      isAggregate: false,
      limit: 25,
      empty: null,
    });
    assert.deepEqual(calledUrls(f), [
      'https://api.nhle.com/test?season=20232024&isAggregate=false&limit=25&empty=',
    ]);
  });

  it('passes redirect mode and a timeout signal to fetch', async () => {
    const f = mockFetch();
    await new HttpClient(new ClientConfig({ followRedirects: false })).get(
      Endpoint.API_WEB_V1,
      'score/now',
    );
    const init = f.mock.calls[0].arguments[1] as RequestInit;
    assert.equal(init.redirect, 'manual');
    assert.ok(init.signal instanceof AbortSignal);
  });
});
