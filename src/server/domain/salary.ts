import type { DocumentsInput, Requirement } from "./models.ts";
import { resolveQuote } from "./quotes.ts";
import { preferencesText } from "./preferences.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";
import { numericMessages } from "./locales/fr.ts";

// Deliberately accepts complete fixed annual gross EUR fields only. Unrecognised
// units, bonus components and conditions must never silently become comparable.
const FIXED_SALARY =
  /^(?:[-*•]\s*)?Salaire\s*:\s*(\d+(?: \d{3})*)(?:\s*(?:-|à)\s*(\d+(?: \d{3})*))?\s*(?:EUR|€)\s+brut\s+annuel\s+fixe(?:,?\s+hors bonus)?\.?$/iu;

export function compareSalary(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  const quote = resolveQuote(documents.job, requirement.jobQuote);

  if (
    !quote ||
    !/^(?:[-*•]\s*)?(?:salaire|rémunération|baseSalary)\s*:/iu.test(quote)
  ) {
    return requirement;
  }

  const minimum = documents.preferences?.minimumAnnualSalary;

  const candidate = minimum
    ? preferencesText({
        minimumAnnualSalary: minimum,
        workMode: null,
        remoteDaysPerWeek: null,
      })
    : null;

  const normalized = {
    ...requirement,
    candidateSource: "preferences" as const,
  };

  if (!minimum) {
    return applyEvidenceDecision(
      normalized,
      "insufficient_information",
      numericMessages.salaryPreferenceMissing,
      null,
      quote,
    );
  }

  const bounds = salaryBounds(quote);

  if (!bounds) {
    return applyEvidenceDecision(
      normalized,
      "insufficient_information",
      numericMessages.salaryUncertain,
      candidate,
      quote,
    );
  }

  const below = bounds.maximum < minimum;

  return applyEvidenceDecision(
    normalized,
    below ? "contradiction" : "equivalence",
    below ? numericMessages.salaryBelow : numericMessages.salaryCompatible,
    candidate,
    quote,
  );
}

function salaryBounds(quote: string) {
  const match = FIXED_SALARY.exec(quote.normalize("NFKC").trim());

  if (!match?.[1]) {
    return null;
  }

  const minimum = Number(match[1].replaceAll(" ", ""));

  const maximum = Number((match[2] ?? match[1]).replaceAll(" ", ""));

  return minimum > 0 && maximum >= minimum ? { minimum, maximum } : null;
}
