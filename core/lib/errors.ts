/**
 * Error type for expected business failures (bad input, sold out, not allowed…).
 * Codes follow the familiar Firebase/gRPC names so the client can react to them;
 * API routes turn them into the matching HTTP status.
 */
export type ErrorCode =
  | "invalid-argument"
  | "failed-precondition"
  | "not-found"
  | "already-exists"
  | "aborted"
  | "unauthenticated"
  | "permission-denied"
  | "resource-exhausted"
  | "internal";

const HTTP_STATUS: Record<ErrorCode, number> = {
  "invalid-argument": 400,
  "failed-precondition": 409,
  "not-found": 404,
  "already-exists": 409,
  aborted: 409,
  unauthenticated: 401,
  "permission-denied": 403,
  "resource-exhausted": 429,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
  get status() {
    return HTTP_STATUS[this.code];
  }
  toJSON() {
    return { code: this.code, message: this.message, ...(this.details !== undefined ? { details: this.details } : {}) };
  }
}
