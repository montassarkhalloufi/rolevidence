import { RequestKey } from "../../../shared/request-key.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import { analysisSnapshot } from "./analysis-snapshot.ts";
import type { AnalysisOutput } from "../../application/analyze.ts";
import type { ProviderRegistry } from "../../application/provider-registry.ts";
import type { CaseFileRepository } from "../../application/case-files.ts";
import { IDEMPOTENCY_HEADER } from "../../../shared/api-config.ts";
import { createHash, randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { AnalysisInput, emptyPreferences } from "../../../shared/analysis.ts";
import type { AnalysisService } from "../../application/analyze.ts";
import { AppError } from "../../application/errors.ts";
import { createIdempotentAnalysis } from "../../application/idempotency.ts";
import type { AnalysisStore } from "../../application/idempotency.ts";

export function createAnalysisController(
  service: AnalysisService,
  store: AnalysisStore<SavedExecution>,
  providers?: ProviderRegistry,
  caseFiles?: CaseFileRepository,
): RequestHandler {
  const run = createIdempotentAnalysis(store);

  return async (req, res) => {
    const parsed = AnalysisInput.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", errorMessages.invalidAnalysisInput);
    }

    const key = req.get(IDEMPOTENCY_HEADER);

    if (!key || !RequestKey.safeParse(key).success) {
      throw new AppError(
        "INVALID_IDEMPOTENCY_KEY",
        errorMessages.invalidRequestKey,
      );
    }

    const {
      profile,
      job,
      preferences = emptyPreferences,
      clarifications,
    } = parsed.data;

    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          reviewedJobQuotes: parsed.data.reviewedJobQuotes,
          clarifications,
          profile,
          job,
          preferences,
          selection: parsed.data.selection,
          dossierId: parsed.data.dossierId,
          dossierRevision: parsed.data.dossierRevision,
        }),
      )
      .digest("hex");

    const selectedService = providers
      ? providers.resolve(parsed.data.selection)
      : service;

    const execution = run(key, fingerprint, async () => {
      const snapshot = analysisSnapshot(parsed.data, caseFiles);

      const output = await selectedService.analyze({
        reviewedJobQuotes: parsed.data.reviewedJobQuotes,
        clarifications,
        profile,
        job,
        preferences,
      });

      return { output, snapshot, persistenceKey: `analysis-${randomUUID()}` };
    });

    res.set("Idempotency-Replayed", String(execution.replayed));
    const { output, snapshot, persistenceKey } = await execution.result;

    if (snapshot) {
      caseFiles?.append(snapshot, output, persistenceKey);
    }

    res.json(output);
  };
}

export type SavedExecution = {
  persistenceKey: string;
  output: AnalysisOutput;
  snapshot: ReturnType<typeof analysisSnapshot>;
};
