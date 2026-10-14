export interface ClientOptions {
  /** Set to true for extra logging (written to stderr). Defaults to false. */
  debug?: boolean;
  /** Request timeout in seconds. Defaults to 10. */
  timeout?: number;
  /** Set to false to skip TLS certificate verification. Defaults to true. */
  sslVerify?: boolean;
  /**
   * Some endpoints use redirects. This is the case when using endpoints that
   * use "/now" in them, which redirect to today's data. Defaults to true.
   */
  followRedirects?: boolean;
}

export class ClientConfig {
  readonly debug: boolean;
  readonly timeout: number;
  readonly sslVerify: boolean;
  readonly followRedirects: boolean;

  readonly apiWebBaseUrl = 'https://api-web.nhle.com';
  readonly apiBaseUrl = 'https://api.nhle.com';
  readonly apiWebApiVer = '/v1/';

  constructor({
    debug = false,
    timeout = 10,
    sslVerify = true,
    followRedirects = true,
  }: ClientOptions = {}) {
    this.debug = debug;
    this.timeout = timeout;
    this.sslVerify = sslVerify;
    this.followRedirects = followRedirects;
  }
}
