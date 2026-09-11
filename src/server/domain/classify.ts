import { rejectDirectiveEvidence } from "./directive-evidence.ts";
import { recoverExplicitConditions } from "./condition-recovery.ts";
import { constrainContradiction } from "./contradiction.ts";
import { compareSalary } from "./salary.ts";
import { compareBackendDuration } from "./backend-duration.ts";
import { normalizeWorkModes } from "./work-mode.ts";
import { hasIncomparableExperience } from "./experience.ts";
import { unassessedRequirement } from "./coverage.ts";
import type {
  AnalysisResult,
  DocumentsInput,
  ExtractionResult,
  Requirement,
  EvidenceState,
  Finding,
  VerificationIssue,
} from "./models.ts";
import { preferencesText } from "./preferences.ts";
import { resolveQuote } from "./quotes.ts";

const states = {
  equivalence: "supported",
  contradiction: "contradicted",
  indirect_evidence: "insufficient_information",
  insufficient_information: "insufficient_information",
} as const;

const categories = {
  supported: "matches",
  contradicted: "gaps",
  insufficient_information: "unknowns",
} as const;

function resolveEvidence(requirement: Requirement, documents: DocumentsInput) {
  const profile = requirement.candidateSource === "profile";

  const proposedCandidate = profile
    ? requirement.profileQuote
    : requirement.preferencesQuote;

  return {
    proposedCandidate,
    candidate: resolveQuote(
      profile ? documents.profile : preferencesText(documents.preferences),
      proposedCandidate,
    ),
    job: resolveQuote(documents.job, requirement.jobQuote),
  };
}

function classifyState(
  requirement: Requirement,
  evidence: ReturnType<typeof resolveEvidence>,
) {
  const proposed = states[requirement.interpretation.relation];

  const incomparableExperience = hasIncomparableExperience(requirement);

  const state: EvidenceState =
    requirement.candidateInformation === "not_provided" ||
    requirement.interpretation.describedPractice === null ||
    incomparableExperience
      ? "insufficient_information"
      : proposed;

  const unverified =
    state !== "insufficient_information" &&
    (!evidence.candidate || !evidence.job);

  return {
    state,
    incomparableExperience,
    unverified,
    reclassified: proposed !== state,
    category: unverified ? ("needsReview" as const) : categories[state],
  };
}

function verificationNote(
  requirement: Requirement,
  evidence: ReturnType<typeof resolveEvidence>,
  status: ReturnType<typeof classifyState>,
): VerificationIssue | null {
  if (!status.unverified && !status.reclassified) {
    return null;
  }

  const missingQuotes: ("candidate" | "job")[] = [];

  if (!evidence.candidate) {
    missingQuotes.push("candidate");
  }

  if (!evidence.job) {
    missingQuotes.push("job");
  }

  return {
    code: status.unverified
      ? "UNVERIFIED_QUOTES"
      : reclassificationCode(status.incomparableExperience),
    missingQuotes,
    proposedCandidateQuote: evidence.proposedCandidate,
    proposedJobQuote: requirement.jobQuote,
  };
}

function classifyRequirement(
  requirement: Requirement,
  documents: DocumentsInput,
) {
  const evidence = resolveEvidence(requirement, documents);

  const status = classifyState(requirement, evidence);

  const {
    candidateInformation: _information,
    candidateSource,
    experienceComparison: _comparison,
    ...finding
  } = requirement;

  const value: Finding = {
    ...finding,
    evidenceState: status.state,
    profileQuote: candidateSource === "profile" ? evidence.candidate : null,
    preferencesQuote:
      candidateSource === "preferences" ? evidence.candidate : null,
    jobQuote: evidence.job,
    verification: verificationNote(requirement, evidence, status),
  };

  return { category: status.category, value };
}

export function classifyRequirements(
  extraction: ExtractionResult,
  documents: DocumentsInput,
): AnalysisResult {
  const result: AnalysisResult = {
    matches: [],
    gaps: [],
    unknowns: [],
    needsReview: [],
  };

  const recovery = recoverExplicitConditions(
    extraction.unassessedJobQuotes ?? [],
    documents,
  );

  for (const requirement of normalizeWorkModes(
    [...extraction.requirements, ...recovery.recovered],
    documents,
  )) {
    const normalized = compareSalary(
      compareBackendDuration(
        constrainContradiction(
          rejectDirectiveEvidence(requirement, documents),
          documents,
        ),
        documents,
      ),
      documents,
    );

    const { category, value } = classifyRequirement(normalized, documents);

    result[category].push(value);
  }

  result.needsReview.push(...recovery.unassessed.map(unassessedRequirement));

  return result;
}

function reclassificationCode(incomparableExperience: boolean) {
  return incomparableExperience
    ? ("INCOMPARABLE_EXPERIENCE" as const)
    : ("MISSING_CANDIDATE_INFORMATION" as const);
}
