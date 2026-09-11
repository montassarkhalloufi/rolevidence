import type { DocumentsInput, Requirement } from "./models.ts";
import { resolveQuote } from "./quotes.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";
import { numericMessages } from "./locales/fr.ts";

const BACKEND_MINIMUM =
  /^(?:[-*•]\s*)?(?:Au moins )?(\d+(?:[.,]\d+)?) ans?(?: d['’]expérience| de)? backend(?: exigés?)?\.?$/iu;

const BACKEND_DURATION =
  /^(?:(?:J['’]ai|Expérience\s*:)\s*)?(?:(exactement|au moins)\s+)?(\d+(?:[.,]\d+)?)(\+)? ans?(?: d['’]expérience| de)? backend\.?$/iu;

export function compareBackendDuration(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  const jobQuote = resolveQuote(documents.job, requirement.jobQuote);

  if (!jobQuote) {
    return requirement;
  }

  const minimum = BACKEND_MINIMUM.exec(jobQuote.trim())?.[1];

  if (!minimum && !requirement.experienceComparison) {
    return requirement;
  }

  const candidate = resolveQuote(documents.profile, requirement.profileQuote);

  if (!candidate) {
    return requirement;
  }

  const duration = candidate ? BACKEND_DURATION.exec(candidate.trim()) : null;

  const normalized = { ...requirement, candidateSource: "profile" as const };

  if (!minimum || !duration?.[2]) {
    return applyEvidenceDecision(
      normalized,
      "insufficient_information",
      numericMessages.durationUncertain,
      candidate,
      jobQuote,
    );
  }

  const decision = compareDuration(duration, Number(minimum.replace(",", ".")));

  return applyEvidenceDecision(
    normalized,
    decision.relation,
    decision.explanation,
    candidate,
    jobQuote,
  );
}

function compareDuration(duration: RegExpExecArray, required: number) {
  const years = Number(duration[2]?.replace(",", "."));

  const lowerBound =
    duration[1]?.toLowerCase() === "au moins" || Boolean(duration[3]);

  if (lowerBound && years < required) {
    return {
      relation: "insufficient_information" as const,
      explanation: numericMessages.durationLowerBound,
    };
  }

  const below = years < required;

  return {
    relation: below ? ("contradiction" as const) : ("equivalence" as const),
    explanation: below
      ? numericMessages.durationBelow
      : numericMessages.durationCompatible,
  };
}
