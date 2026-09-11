import type {
  AnalysisResult,
  Relation,
} from "../../src/server/domain/models.ts";

export type ExpectedFinding = { subjectPattern: string; relation: Relation };

const buckets = {
  equivalence: "matches",
  contradiction: "gaps",
  indirect_evidence: "unknowns",
  insufficient_information: "unknowns",
} as const;

export function passesEvaluation(
  analysis: AnalysisResult,
  expected: Relation,
  alternative?: ExpectedFinding[],
): boolean {
  const findings = Object.values(analysis).flat();

  if (
    findings.length === 1 &&
    analysis[buckets[expected]][0]?.interpretation.relation === expected
  ) {
    return true;
  }

  if (
    !alternative ||
    findings.length !== alternative.length ||
    analysis.needsReview.length > 0
  ) {
    return false;
  }

  const consumed = new Set<AnalysisResult["matches"][number]>();

  for (const expectation of alternative) {
    const found = analysis[buckets[expectation.relation]].find(
      (finding) =>
        !consumed.has(finding) &&
        finding.interpretation.relation === expectation.relation &&
        new RegExp(expectation.subjectPattern, "iu").test(finding.subject),
    );

    if (!found) {
      return false;
    }

    consumed.add(found);
  }

  return true;
}
