export interface ClientOptions {
  /** Set to true for extra logging (written to stderr). Defaults to false. */
  debug?: boolean;
  /** Request timeout in seconds. Defaults to 10. */
  timeout?: number;
  /**
   * Some endpoints use redirects. This is the case when using endpoints that
   * use "/now" in them, which redirect to today's data. Defaults to true.
   */
  followRedirects?: boolean;
  /** Overrides the fetch implementation used for requests. Defaults to the global fetch. */
  fetch?: typeof fetch;
}

export interface Config {
  readonly debug: boolean;
  readonly timeout: number;
  readonly followRedirects: boolean;
  readonly fetch?: typeof fetch;
}

export function resolveConfig(options: ClientOptions = {}): Readonly<Config> {
  const {
    debug = false,
    timeout = 10,
    followRedirects = true,
    fetch,
  } = options;
  return { debug, timeout, followRedirects, fetch };
}
