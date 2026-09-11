import type { DocumentsInput, Requirement } from "./models.ts";
import { compareSalary } from "./salary.ts";
import { compareExplicitWorkMode } from "./work-mode.ts";

export function recoverExplicitConditions(
  quotes: string[],
  documents: DocumentsInput,
) {
  const recovered: Requirement[] = [];

  const unassessed: string[] = [];

  for (const quote of quotes) {
    const initial: Requirement = {
      subject: quote,
      explanation: "",
      interpretation: {
        relation: "insufficient_information",
        describedPractice: null,
        justification: "",
      },
      candidateSource: "preferences",
      candidateInformation: "not_provided",
      profileQuote: null,
      preferencesQuote: null,
      jobQuote: quote,
    };

    const compared = compareSalary(
      compareExplicitWorkMode(initial, documents),
      documents,
    );

    if (compared === initial) {
      unassessed.push(quote);
    } else {
      recovered.push(compared);
    }
  }

  return { recovered, unassessed };
}
