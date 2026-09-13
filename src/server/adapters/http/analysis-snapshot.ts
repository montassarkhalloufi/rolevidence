import { errorMessages } from "../../application/locales/errors-fr.ts";
import { Documents, emptyPreferences } from "../../../shared/analysis.ts";
import type { AnalysisInputData } from "../../../shared/analysis.ts";
import type { CaseFileRepository } from "../../application/case-files.ts";
import { AppError } from "../../application/errors.ts";

export function analysisSnapshot(
  input: AnalysisInputData,
  repository?: CaseFileRepository,
) {
  if (!input.dossierId) {
    return undefined;
  }

  const saved = repository?.get(input.dossierId);

  if (!saved) {
    throw new AppError("NOT_FOUND", errorMessages.caseFileMissing);
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
      errorMessages.unsavedAnalysisInput,
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
