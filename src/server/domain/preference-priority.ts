import { preferenceMessages } from "./locales/fr.ts";
import type { DocumentsInput, Requirement } from "./models.ts";
import { resolveQuote } from "./quotes.ts";
import { preferencesText } from "./preferences.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";

export function applyPreferencePriority(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  if (
    requirement.candidateSource !== "preferences" ||
    requirement.interpretation.relation === "equivalence"
  ) {
    return requirement;
  }

  const candidate = resolveQuote(
    preferencesText(documents.preferences),
    requirement.preferencesQuote,
  );

  const job = resolveQuote(documents.job, requirement.jobQuote);

  if (!candidate || !job) {
    return requirement;
  }

  const preferred = isNegotiable(candidate, documents);

  if (!preferred) {
    return requirement;
  }

  return {
    ...applyEvidenceDecision(
      requirement,
      "insufficient_information",
      preferenceMessages.negotiable(requirement.interpretation.justification),
      candidate,
      job,
    ),
    assessment: "negotiable_preference",
  };
}

function isNegotiable(candidate: string, documents: DocumentsInput) {
  if (candidate.startsWith("Salaire minimum :")) {
    return documents.preferences?.salaryPriority === "preferred";
  }

  return (
    /^(?:Mode de travail|Télétravail minimum) :/u.test(candidate) &&
    documents.preferences?.workModePriority === "preferred"
  );
}
