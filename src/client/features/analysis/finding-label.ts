import type { AnalysisResult } from "../../../shared/analysis.ts";
import { fr } from "../../shared/i18n/fr.ts";

export function findingLabel(
  finding: AnalysisResult["matches"][number],
  fallback: string,
) {
  if (finding.verification) {
    return fallback;
  }

  if (finding.assessment) {
    return {
      possible_compatibility: fr.possibleCompatibility,
      declared_education_gap: fr.declaredEducationGap,
      negotiable_preference: fr.negotiablePreference,
    }[finding.assessment];
  }

  return finding.evidenceState === "insufficient_information" &&
    finding.interpretation.relation === "indirect_evidence"
    ? fr.partialEvidence
    : fallback;
}
