import type { Config } from '#src/config.mjs';
import type { Get } from '#src/context.mjs';
import {
  BadRequestException,
  NHLApiException,
  RateLimitExceededException,
  ResourceNotFoundException,
  ServerErrorException,
  UnauthorizedException,
} from '#src/errors.mjs';

export const Endpoint = {
  API_WEB_V1: 'https://api-web.nhle.com/v1/',
  API_CORE: 'https://api.nhle.com/',
  API_STATS: 'https://api.nhle.com/stats/rest/',
} as const;

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint];

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue>;

/** Converts a query param value the same way httpx does (True -> "true", None -> ""). */
function paramToString(value: QueryParamValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function buildUrl(
  endpoint: Endpoint,
  resource: string,
  queryParams?: QueryParams,
): string {
  const url = `${endpoint}${resource}`;
  if (!queryParams) {
    return url;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    search.append(key, paramToString(value));
  }
  const qs = search.toString();
  if (!qs) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
}

/** Maps a non-2xx HTTP status to the matching NHLApiException subclass. */
export function errorForStatus(
  status: number,
  message: string,
): NHLApiException {
  if (status === 404) {
    return new ResourceNotFoundException(message);
  }
  if (status === 429) {
    return new RateLimitExceededException(message);
  }
  if (status === 400) {
    return new BadRequestException(message);
  }
  if (status === 401) {
    return new UnauthorizedException(message);
  }
  if (status >= 500 && status < 600) {
    return new ServerErrorException(message, status);
  }
  return new NHLApiException(`Unexpected error: ${message}`, status);
}

/** Builds the error message for a non-2xx response, sniffing a JSON `message` field. */
export async function readErrorMessage(
  response: Response,
  url: string,
): Promise<string> {
  let errorMessage = `Request to ${url} failed`;
  try {
    const json: unknown = await response.json();
    if (json !== null && typeof json === 'object' && !Array.isArray(json)) {
      const detail = (json as Record<string, unknown>).message;
      if (detail) {
        errorMessage = `${errorMessage}: ${detail}`;
      }
    }
  } catch {
    // Response isn't JSON or doesn't have a message field
  }
  return errorMessage;
}

/**
 * Builds a `Get` function bound to the given config.
 *
 * @throws ResourceNotFoundException When the resource is not found
 * @throws RateLimitExceededException When rate limit is exceeded
 * @throws ServerErrorException When server returns 5xx error
 * @throws BadRequestException When request is malformed
 * @throws UnauthorizedException When authentication fails
 * @throws NHLApiException For other unexpected errors
 */
export function createGet(config: Config): Get {
  function debug(message: string): void {
    if (config.debug) {
      console.error(`nhl-api-ts.http_client - DEBUG - ${message}`);
    }
  }

  return async (endpoint, resource, queryParams) => {
    const fullUrl = buildUrl(endpoint, resource, queryParams);
    debug(`GET: ${fullUrl}`);

    const doFetch = config.fetch ?? globalThis.fetch;
    const response = await doFetch(fullUrl, {
      signal: AbortSignal.timeout(config.timeout * 1000),
      redirect: config.followRedirects ? 'follow' : 'manual',
    });

    if (!response.ok) {
      const message = await readErrorMessage(response, resource);
      throw errorForStatus(response.status, message);
    }
    return response;
  };
}
