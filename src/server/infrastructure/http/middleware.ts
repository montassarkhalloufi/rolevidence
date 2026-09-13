import { errorMessages } from "../../application/locales/errors-fr.ts";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import {
  API_ROOT,
  API_PATHS,
  LOCAL_CLIENT_HEADER,
  LOCAL_CLIENT_VALUE,
} from "../../../shared/api-config.ts";
import { AppError } from "../../application/errors.ts";

export type RequestEvent = {
  requestId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
};

export function requestMetadata(
  observe: (event: RequestEvent) => void,
): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();

    const started = performance.now();

    res.set("Cache-Control", "no-store");
    res.set("X-Request-Id", requestId);
    res.set("X-Content-Type-Options", "nosniff");
    res.once("finish", () =>
      observe({
        requestId,
        method: req.method,
        route:
          typeof req.route?.path === "string" ? req.route.path : "unmatched",
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    next();
  };
}

export const localRequestGuard: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();

    return;
  }

  const expectedType =
    req.path === API_PATHS.resumeExtraction.slice(API_ROOT.length)
      ? "multipart/form-data"
      : "application/json";

  if (
    req.get(LOCAL_CLIENT_HEADER) !== LOCAL_CLIENT_VALUE ||
    !req.is(expectedType)
  ) {
    throw new AppError("FORBIDDEN", errorMessages.forbiddenMutation);
  }

  next();
};

const loopbackAuthority =
  /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i;

export const localHostGuard: RequestHandler = (req, _res, next) => {
  if (!loopbackAuthority.test(req.get("host") ?? "")) {
    throw new AppError("FORBIDDEN", errorMessages.forbiddenHost);
  }

  next();
};
