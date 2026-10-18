/** NHL API specific error codes. */
export const NHLApiErrorCode = {
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type NHLApiErrorCode =
  (typeof NHLApiErrorCode)[keyof typeof NHLApiErrorCode];

/** Base exception for NHL API errors. */
export class NHLApiException extends Error {
  readonly statusCode: number;
  readonly errorCode?: NHLApiErrorCode;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: NHLApiErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

/** Raised when a resource is not found (404). */
export class ResourceNotFoundException extends NHLApiException {
  constructor(message: string, statusCode = 404) {
    super(message, statusCode, NHLApiErrorCode.RESOURCE_NOT_FOUND);
  }
}

/** Raised when rate limit is exceeded (429). */
export class RateLimitExceededException extends NHLApiException {
  constructor(message: string, statusCode = 429) {
    super(message, statusCode, NHLApiErrorCode.RATE_LIMIT_EXCEEDED);
  }
}

/** Raised for server errors (5xx). */
export class ServerErrorException extends NHLApiException {
  constructor(message: string, statusCode: number) {
    super(message, statusCode, NHLApiErrorCode.SERVER_ERROR);
  }
}

/** Raised for client errors (400). */
export class BadRequestException extends NHLApiException {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode, NHLApiErrorCode.BAD_REQUEST);
  }
}

/** Raised for authentication errors (401). */
export class UnauthorizedException extends NHLApiException {
  constructor(message: string, statusCode = 401) {
    super(message, statusCode, NHLApiErrorCode.UNAUTHORIZED);
  }
}
