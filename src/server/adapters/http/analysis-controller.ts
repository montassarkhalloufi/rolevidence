import { analysisSnapshot } from "./analysis-snapshot.ts";
import type { AnalysisOutput } from "../../application/analyze.ts";
import type { ProviderRegistry } from "../../application/provider-registry.ts";
import type { DossierRepository } from "../../application/dossiers.ts";
import { IDEMPOTENCY_HEADER } from "../../../shared/api-config.ts";
import { createHash } from "node:crypto";
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
  dossiers?: DossierRepository,
): RequestHandler {
  const run = createIdempotentAnalysis(store);

  return async (req, res) => {
    const parsed = AnalysisInput.safeParse(req.body);

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
      .update(
        JSON.stringify({
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
      const snapshot = analysisSnapshot(parsed.data, dossiers);

      const output = await selectedService.analyze({
        profile,
        job,
        preferences,
      });

      return { output, snapshot };
    });

    res.set("Idempotency-Replayed", String(execution.replayed));
    const { output, snapshot } = await execution.result;

    if (snapshot) {
      dossiers?.append(snapshot, output, key);
    }

    res.json(output);
  };
}

export type SavedExecution = {
  output: AnalysisOutput;
  snapshot: ReturnType<typeof analysisSnapshot>;
};
