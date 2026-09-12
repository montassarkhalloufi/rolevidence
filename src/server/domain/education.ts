import { educationMessages } from "./locales/fr.ts";
import type { DocumentsInput, Requirement } from "./models.ts";
import { resolveQuote } from "./quotes.ts";
import { applyEvidenceDecision } from "./evidence-decision.ts";

export function compareDeclaredEducation(
  requirement: Requirement,
  documents: DocumentsInput,
): Requirement {
  const incomplete = incompleteEducation(requirement, documents);

  if (incomplete) {
    return incomplete;
  }

  const comparison = requirement.educationComparison;

  if (
    !comparison ||
    comparison.basis === "uncertain" ||
    comparison.candidateLevel >= comparison.requiredLevel ||
    requirement.candidateSource !== "profile"
  ) {
    return requirement;
  }

  const evidence = verifiedEducationEvidence(requirement, documents);

  if (!evidence) {
    return requirement;
  }

  const { candidate, job } = evidence;

  const explanation = educationMessages.declaredGap(
    comparison.candidateLevel,
    comparison.requiredLevel,
  );

  return {
    ...applyEvidenceDecision(
      requirement,
      "contradiction",
      explanation,
      candidate,
      job,
    ),
    assessment: "declared_education_gap",
  };
}

function hasQualification(text: string) {
  return /\b(?:dipl[oô]me|baccalaur[ée]at|licence|licenciatura|bachelor|master|mast[eè]re|doctorat|degree|bac\s*\+\s*\d)\b/iu.test(
    text,
  );
}

function incompleteEducation(
  requirement: Requirement,
  documents: DocumentsInput,
) {
  if (!requirement.educationComparison) {
    return null;
  }

  const candidate = resolveQuote(documents.profile, requirement.profileQuote);

  const job = resolveQuote(documents.job, requirement.jobQuote);

  if (
    !candidate ||
    !job ||
    !/\b(?:en cours|non obtenu|non achevé|in progress|not completed)\b/iu.test(
      candidate,
    )
  ) {
    return null;
  }

  return {
    ...applyEvidenceDecision(
      requirement,
      "insufficient_information",
      educationMessages.incomplete,
      candidate,
      job,
    ),
    educationComparison: null,
  };
}

function verifiedEducationEvidence(
  requirement: Requirement,
  documents: DocumentsInput,
) {
  const candidate = resolveQuote(documents.profile, requirement.profileQuote);

  const job = resolveQuote(documents.job, requirement.jobQuote);

  if (
    !candidate ||
    !job ||
    requirement.candidateInformation !== "provided" ||
    !hasQualification(candidate) ||
    !hasQualification(job)
  ) {
    return null;
  }

  return { candidate, job };
}
