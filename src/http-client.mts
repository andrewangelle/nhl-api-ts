import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { ClientConfig } from '#src/config.mjs';
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

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;

/**
 * Minimal GET over node:https used when TLS verification is disabled, since the
 * global fetch has no per-request way to turn it off.
 */
async function insecureGet(
  url: string,
  init: { signal: AbortSignal; redirect: RequestRedirect },
  redirects = 0,
): Promise<Response> {
  const { status, headers, body } = await new Promise<{
    status: number;
    headers: Headers;
    body: Buffer;
  }>((resolve, reject) => {
    const target = new URL(url);
    const send = target.protocol === 'http:' ? httpRequest : httpsRequest;
    const req = send(
      target,
      { method: 'GET', rejectUnauthorized: false, signal: init.signal },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (value !== undefined) {
              headers.set(
                name,
                Array.isArray(value) ? value.join(', ') : value,
              );
            }
          }
          resolve({
            status: res.statusCode ?? 0,
            headers,
            body: Buffer.concat(chunks),
          });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });

  const location = headers.get('location');
  if (
    init.redirect === 'follow' &&
    REDIRECT_STATUSES.has(status) &&
    location &&
    redirects < MAX_REDIRECTS
  ) {
    return insecureGet(new URL(location, url).href, init, redirects + 1);
  }
  const nullBody = status === 204 || status === 304 || status < 200;
  return new Response(nullBody ? null : new Uint8Array(body), {
    status,
    headers,
  });
}

export class HttpClient {
  readonly config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private debug(message: string): void {
    if (this.config.debug) {
      console.error(`nhl-api-ts.http_client - DEBUG - ${message}`);
    }
  }

  /** Throws the appropriate NHLApiException for a non-2xx response. */
  private async handleResponse(response: Response, url: string): Promise<void> {
    if (response.ok) {
      return;
    }

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

    const status = response.status;
    if (status === 404) {
      throw new ResourceNotFoundException(errorMessage);
    }
    if (status === 429) {
      throw new RateLimitExceededException(errorMessage);
    }
    if (status === 400) {
      throw new BadRequestException(errorMessage);
    }
    if (status === 401) {
      throw new UnauthorizedException(errorMessage);
    }
    if (status >= 500 && status < 600) {
      throw new ServerErrorException(errorMessage, status);
    }
    throw new NHLApiException(`Unexpected error: ${errorMessage}`, status);
  }

  /**
   * Makes a GET request to the NHL API.
   *
   * @throws ResourceNotFoundException When the resource is not found
   * @throws RateLimitExceededException When rate limit is exceeded
   * @throws ServerErrorException When server returns 5xx error
   * @throws BadRequestException When request is malformed
   * @throws UnauthorizedException When authentication fails
   * @throws NHLApiException For other unexpected errors
   */
  async get(
    endpoint: Endpoint,
    resource: string,
    queryParams?: QueryParams,
  ): Promise<Response> {
    const fullUrl = buildUrl(endpoint, resource, queryParams);
    this.debug(`GET: ${fullUrl}`);

    const init = {
      signal: AbortSignal.timeout(this.config.timeout * 1000),
      redirect: (this.config.followRedirects
        ? 'follow'
        : 'manual') as RequestRedirect,
    };
    const response = this.config.sslVerify
      ? await fetch(fullUrl, init)
      : await insecureGet(fullUrl, init);

    await this.handleResponse(response, resource);
    return response;
  }
}
