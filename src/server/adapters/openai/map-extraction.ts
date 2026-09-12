import { resolveQuote } from "../../domain/quotes.ts";
import type { ExtractionResult, Requirement } from "../../domain/models.ts";
import type { ProviderExtraction } from "./extraction.ts";
import type { SourceCatalog, SourcePassage } from "./sources.ts";
import { substantiveJobPassages } from "./sources.ts";

function sourceText(passages: SourcePassage[], id: string | null) {
  return passages.find((passage) => passage.id === id)?.text ?? null;
}

function mapRequirement(
  item: ProviderExtraction["requirements"][number],
  catalog: SourceCatalog,
): Requirement {
  const {
    profileEvidenceId,
    profileEvidenceQuote,
    preferencesEvidenceId,
    jobEvidenceId,
    experienceComparison,
    ...requirement
  } = item;

  // Preserve unresolved proposals: the domain verifies against the full original
  // document and retains invalid text only in verification diagnostics.
  return {
    ...requirement,
    ...(requirement.candidateSource === "clarification"
      ? {
          clarificationQuote:
            resolveProfileEvidence(
              catalog.clarifications,
              profileEvidenceId,
              profileEvidenceQuote,
            ) ?? profileEvidenceQuote,
        }
      : {}),
    explanation: sourceText(catalog.job, jobEvidenceId) ?? "",
    experienceComparison,
    profileQuote:
      requirement.candidateSource === "clarification"
        ? null
        : (resolveProfileEvidence(
            catalog.profile,
            profileEvidenceId,
            profileEvidenceQuote,
          ) ?? profileEvidenceQuote),
    preferencesQuote: sourceText(catalog.preferences, preferencesEvidenceId),
    jobQuote: sourceText(catalog.job, jobEvidenceId),
  };
}

export function mapExtraction(
  extraction: ProviderExtraction,
  catalog: SourceCatalog,
): ExtractionResult {
  const covered = new Set(
    extraction.requirements.map((item) => item.jobEvidenceId),
  );

  return {
    requirements: extraction.requirements.map((item) =>
      mapRequirement(item, catalog),
    ),
    unassessedJobQuotes: substantiveJobPassages(catalog)
      .filter((passage) => !covered.has(passage.id))
      .map((passage) => passage.text),
  };
}

function resolveProfileEvidence(
  passages: SourcePassage[],
  selectedId: string | null,
  quote: string | null,
) {
  if (!quote) {
    return null;
  }

  const selected = sourceText(passages, selectedId);

  const selectedQuote = resolveQuote(selected ?? "", quote);

  if (selectedQuote) {
    return selectedQuote;
  }

  // A model may choose an adjacent ID. Repair only with an exact source match,
  // never fuzzy skill matching, fabricated wording or an unverified ID fallback.
  for (const passage of passages) {
    const resolved = resolveQuote(passage.text, quote);

    if (resolved) {
      return resolved;
    }
  }

  return null;
}
