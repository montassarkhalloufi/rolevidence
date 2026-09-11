import type { DocumentsInput, Requirement } from "./models.ts";
import { resolveQuote } from "./quotes.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";
import { evidenceMessages } from "./locales/fr.ts";

// This is only a conservative veto, not proof of semantic contradiction.
// Numeric policies independently validate comparable values after this check.
const EXPLICIT_NEGATION =
  /\b(?:jamais|aucun(?:e)?|never|no)\b|\b(?:ne|n['’])[^.!?\n]*\bpas\b/iu;

export function constrainContradiction(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  if (
    requirement.candidateInformation === "not_provided" ||
    requirement.interpretation.describedPractice === null ||
    requirement.candidateSource !== "profile" ||
    requirement.interpretation.relation !== "contradiction"
  ) {
    return requirement;
  }

  const candidate = resolveQuote(documents.profile, requirement.profileQuote);

  const job = resolveQuote(documents.job, requirement.jobQuote);

  if (!candidate || !job || EXPLICIT_NEGATION.test(candidate)) {
    return requirement;
  }

  return applyEvidenceDecision(
    requirement,
    "insufficient_information",
    evidenceMessages.unsupportedContradiction,
    candidate,
    job,
  );
}
