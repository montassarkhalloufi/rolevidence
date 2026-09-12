export type Relation =
  | "equivalence"
  | "indirect_evidence"
  | "contradiction"
  | "insufficient_information";

export type EvidenceState =
  "supported" | "contradicted" | "insufficient_information";

export type Interpretation = {
  describedPractice: string | null;
  relation: Relation;
  justification: string;
};

export type PreferencesInput = {
  minimumAnnualSalary: number | null;
  workMode: "onsite" | "hybrid" | "remote" | null;
  remoteDaysPerWeek: number | null;
};

export type DocumentsInput = {
  reviewedJobQuotes?: string[] | undefined;
  clarifications?: string | undefined;
  profile: string;
  job: string;
  preferences?: PreferencesInput | undefined;
};

export type Evidence = {
  jobQuotes?: string[] | undefined;
  clarificationQuote?: string | null | undefined;
  subject: string;
  explanation: string;
  interpretation: Interpretation;
  profileQuote: string | null;
  preferencesQuote: string | null;
  jobQuote: string | null;
};

export type ExperienceComparison = {
  comparableScope: boolean;
  candidateDuration: "exact" | "lower_bound" | "unknown";
};

export type Requirement = Evidence & {
  experienceComparison?: ExperienceComparison | null;
  candidateInformation: "provided" | "not_provided";
  candidateSource: "profile" | "preferences" | "clarification";
};

export type ExtractionResult = {
  requirements: Requirement[];
  unassessedJobQuotes?: string[];
};

export type VerificationIssue = {
  code:
    | "UNVERIFIED_QUOTES"
    | "MISSING_CANDIDATE_INFORMATION"
    | "INCOMPARABLE_EXPERIENCE"
    | "MISSING_REQUIREMENT_ANALYSIS";
  missingQuotes: ("candidate" | "job")[];
  proposedCandidateQuote: string | null;
  proposedJobQuote: string | null;
};

export type Finding = Evidence & {
  evidenceState: EvidenceState;
  verification: VerificationIssue | null;
};

export type AnalysisResult = {
  matches: Finding[];
  gaps: Finding[];
  unknowns: Finding[];
  needsReview: Finding[];
};

export const emptyPreferences: PreferencesInput = {
  minimumAnnualSalary: null,
  workMode: null,
  remoteDaysPerWeek: null,
};
