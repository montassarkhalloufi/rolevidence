import { runtimeMessages } from "../../application/locales/runtime-fr.ts";
import { STATUS_CODES } from "node:http";
import type { ErrorRequestHandler } from "express";
import multer from "multer";
import type { AppErrorCode } from "../../application/errors.ts";
import { AppError } from "../../application/errors.ts";

const statuses: Record<AppErrorCode, number> = {
  STORAGE_ERROR: 507,
  INVALID_INPUT: 400,
  INVALID_IDEMPOTENCY_KEY: 400,
  MISSING_FILE: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE: 415,
  IMPORT_TIMEOUT: 422,
  IMPORT_FAILED: 422,
  REFUSAL: 422,
  BUSY: 429,
  CAPACITY: 503,
  NOT_CONFIGURED: 503,
  INCOMPLETE: 502,
  INVALID_OUTPUT: 502,
  CONNECTION: 502,
  PROVIDER_ERROR: 502,
  TIMEOUT: 504,
};

function bodyErrorType(error: unknown) {
  return typeof error === "object" && error !== null && "type" in error
    ? error.type
    : undefined;
}

function describeError(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: statuses[error.code] ?? 500,
      code: error.code,
      detail: error.message,
    };
  }

  if (error instanceof multer.MulterError) {
    return {
      status: error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
      code: "INVALID_UPLOAD",
      detail: runtimeMessages.uploadInvalid,
    };
  }

  const type = bodyErrorType(error);

  if (type === "entity.too.large" || type === "entity.parse.failed") {
    return {
      status: type === "entity.too.large" ? 413 : 400,
      code: "INVALID_BODY",
      detail: runtimeMessages.bodyInvalid,
    };
  }

  return {
    status: 500,
    code: "INTERNAL",
    detail: runtimeMessages.internalError,
  };
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);

    return;
  }

  const { status, code, detail } = describeError(error);

  if (status === 429 || code === "CAPACITY") {
    res.set("Retry-After", "60");
  }

  res
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title: STATUS_CODES[status] ?? "Error",
      status,
      detail,
      code,
      requestId: res.getHeader("X-Request-Id"),
    });
};
