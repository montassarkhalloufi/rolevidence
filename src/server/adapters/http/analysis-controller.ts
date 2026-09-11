import { IDEMPOTENCY_HEADER } from "../../../shared/api-config.ts";
import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import { Documents, emptyPreferences } from "../../../shared/analysis.ts";
import type { AnalysisService } from "../../application/analyze.ts";
import { AppError } from "../../application/errors.ts";
import { createIdempotentAnalysis } from "../../application/idempotency.ts";
import type { AnalysisStore } from "../../application/idempotency.ts";

export function createAnalysisController(
  service: AnalysisService,
  store: AnalysisStore,
): RequestHandler {
  const run = createIdempotentAnalysis(store);

  return async (req, res) => {
    const parsed = Documents.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        "INVALID_INPUT",
        "Documents ou préférences invalides.",
      );
    }

    const key = req.get(IDEMPOTENCY_HEADER);

    if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
      throw new AppError(
        "INVALID_IDEMPOTENCY_KEY",
        "Une clé de demande de 16 à 128 caractères est requise.",
      );
    }

    const { profile, job, preferences = emptyPreferences } = parsed.data;

    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ profile, job, preferences }))
      .digest("hex");

    const execution = run(key, fingerprint, () => service.analyze(parsed.data));

    res.set("Idempotency-Replayed", String(execution.replayed));
    res.json(await execution.result);
  };
}
