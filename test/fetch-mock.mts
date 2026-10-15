import { mock } from 'node:test';
import { createNHLClient, type NHLClient } from '#src/index.mjs';

export type Responder = (url: string) => { status?: number; body?: unknown };

/**
 * Replaces global fetch for the current test. Every request answers 200 with
 * `{}` unless a responder is given. Restored automatically by `mock.restoreAll()`.
 */
export function mockFetch(responder: Responder = () => ({})) {
  return mock.method(globalThis, 'fetch', async (input: string | URL) => {
    const url = String(input);
    const { status = 200, body = {} } = responder(url);
    return new Response(
      typeof body === 'string' ? body : JSON.stringify(body),
      {
        status,
        headers: { 'content-type': 'application/json' },
      },
    );
  });
}

/** URLs requested through the mocked fetch, in order. */
export const calledUrls = (fetchMock: ReturnType<typeof mockFetch>): string[] =>
  fetchMock.mock.calls.map((call) => String(call.arguments[0]));

/** Query params of a requested URL as a plain object. */
export const queryOf = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams);

/** The URL without its query string. */
export const pathOf = (url: string): string => url.split('?')[0];

export const newClient = (): NHLClient => createNHLClient();
