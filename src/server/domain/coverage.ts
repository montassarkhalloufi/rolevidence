import type { Finding } from "./models.ts";

export function unassessedRequirement(jobQuote: string): Finding {
  return {
    subject: jobQuote,
    explanation: "",
    interpretation: {
      describedPractice: null,
      relation: "insufficient_information",
      justification: "",
    },
    evidenceState: "insufficient_information",
    profileQuote: null,
    preferencesQuote: null,
    jobQuote,
    verification: {
      code: "MISSING_REQUIREMENT_ANALYSIS",
      missingQuotes: [],
      proposedCandidateQuote: null,
      proposedJobQuote: jobQuote,
    },
  };
}
