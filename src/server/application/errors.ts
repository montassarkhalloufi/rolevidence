export type AppErrorCode =
  | "BUSY"
  | "CAPACITY"
  | "CONNECTION"
  | "FILE_TOO_LARGE"
  | "FORBIDDEN"
  | "IDEMPOTENCY_CONFLICT"
  | "IMPORT_FAILED"
  | "IMPORT_TIMEOUT"
  | "INCOMPLETE"
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_INPUT"
  | "INVALID_OUTPUT"
  | "MISSING_FILE"
  | "NOT_CONFIGURED"
  | "NOT_FOUND"
  | "PROVIDER_ERROR"
  | "REFUSAL"
  | "TIMEOUT"
  | "UNSUPPORTED_FILE";

export class AppError extends Error {
  readonly code: AppErrorCode;
  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}
