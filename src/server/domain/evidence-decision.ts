import type { Requirement, Relation } from "./models.ts";

export function applyEvidenceDecision(
  requirement: Requirement,
  relation: Relation,
  explanation: string,
  candidateQuote: string | null,
  jobQuote: string,
): Requirement {
  return {
    ...requirement,
    explanation,
    experienceComparison: null,
    candidateInformation: candidateQuote ? "provided" : "not_provided",
    ...(requirement.candidateSource === "clarification"
      ? { clarificationQuote: candidateQuote }
      : {}),
    profileQuote:
      requirement.candidateSource === "profile" ? candidateQuote : null,
    preferencesQuote:
      requirement.candidateSource === "preferences" ? candidateQuote : null,
    jobQuote,
    interpretation: {
      relation,
      describedPractice: candidateQuote,
      justification: explanation,
    },
  };
}
