import { Documents, emptyPreferences } from "../../../shared/analysis.ts";
import type { AnalysisInputData } from "../../../shared/analysis.ts";
import type { DossierRepository } from "../../application/dossiers.ts";
import { AppError } from "../../application/errors.ts";

export function analysisSnapshot(
  input: AnalysisInputData,
  repository?: DossierRepository,
) {
  if (!input.dossierId) {
    return undefined;
  }

  const saved = repository?.get(input.dossierId);

  if (!saved) {
    throw new AppError("NOT_FOUND", "Dossier introuvable.");
  }

  const documents = Documents.parse(saved.documents);

  const requested = {
    reviewedJobQuotes: reviewedQuotes(input),
    clarifications: clarificationText(input),
    profile: input.profile,
    job: input.job,
    preferences: input.preferences ?? emptyPreferences,
  };

  const normalized = {
    reviewedJobQuotes: reviewedQuotes(documents),
    clarifications: clarificationText(documents),
    profile: documents.profile,
    job: documents.job,
    preferences: documents.preferences ?? emptyPreferences,
  };

  if (
    saved.revision !== input.dossierRevision ||
    JSON.stringify(normalized) !== JSON.stringify(requested) ||
    JSON.stringify(saved.selection) !== JSON.stringify(input.selection)
  ) {
    throw new AppError(
      "IDEMPOTENCY_CONFLICT",
      "Enregistrez le dossier avant de lancer l’analyse.",
    );
  }

  return { ...saved, documents: normalized };
}

function clarificationText(value: { clarifications?: string | undefined }) {
  return value.clarifications ?? "";
}

function reviewedQuotes(value: { reviewedJobQuotes?: string[] | undefined }) {
  return value.reviewedJobQuotes ?? [];
}
