import type { Endpoint, QueryParams } from '#src/http-client.mjs';

export type Get = (
  endpoint: Endpoint,
  resource: string,
  params?: QueryParams,
) => Promise<Response>;

export interface Context {
  get: Get;
  sleep: (seconds: number) => Promise<void>;
}
