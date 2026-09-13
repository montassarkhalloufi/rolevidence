import { fr } from "../../shared/i18n/fr.ts";
import type { AnalysisResult } from "../../../shared/analysis.ts";

type Finding = AnalysisResult["matches"][number];

const verificationLabels = {
  UNVERIFIED_QUOTES: fr.unverifiedConclusion,
  MISSING_CANDIDATE_INFORMATION: fr.missingInformation,
  INCOMPARABLE_EXPERIENCE: fr.incomparableExperience,
  MISSING_REQUIREMENT_ANALYSIS: fr.missingRequirementAnalysis,
};

export function findingSummary(finding: Finding) {
  return finding.verification
    ? verificationLabels[finding.verification.code]
    : finding.interpretation.justification;
}
