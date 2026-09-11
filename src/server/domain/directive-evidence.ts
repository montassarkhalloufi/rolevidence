import type { Requirement, DocumentsInput } from "./models.ts";
import { isResponseDirective } from "./document-directives.ts";
import { resolveQuote } from "./quotes.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";
import { evidenceMessages } from "./locales/fr.ts";

export function rejectDirectiveEvidence(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  if (
    requirement.candidateSource !== "profile" ||
    !isResponseDirective(requirement.profileQuote ?? "")
  ) {
    return requirement;
  }

  const jobQuote = resolveQuote(documents.job, requirement.jobQuote);

  if (!jobQuote) {
    return requirement;
  }

  return applyEvidenceDecision(
    requirement,
    "insufficient_information",
    evidenceMessages.directive,
    null,
    jobQuote,
  );
}
