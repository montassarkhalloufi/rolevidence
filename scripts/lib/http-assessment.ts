import type {
  AnalysisResult,
  DocumentsInput,
} from "../../src/shared/analysis.ts";
import { resolveQuote } from "../../src/server/domain/quotes.ts";
import { preferencesText } from "../../src/server/domain/preferences.ts";

export type ExpectedCriterion = {
  subjectPattern: string;
  category: "matches" | "gaps" | "unknowns";
};

export function assess(
  analysis: AnalysisResult,
  expected: ExpectedCriterion[],
  documents: DocumentsInput,
) {
  const rows = Object.entries(analysis).flatMap(([category, findings]) =>
    findings.map((finding) => ({ category, finding })),
  );

  const errors: string[] = [];

  const used = new Set<number>();

  if (rows.length !== expected.length) {
    errors.push(`count:${rows.length}/${expected.length}`);
  }

  for (const criterion of expected) {
    const index = rows.findIndex(
      (row, i) =>
        !used.has(i) &&
        row.category === criterion.category &&
        new RegExp(criterion.subjectPattern, "iu").test(row.finding.subject),
    );

    if (index < 0) {
      errors.push(`missing:${criterion.subjectPattern}:${criterion.category}`);
    } else {
      used.add(index);
    }
  }

  for (const { category, finding } of rows) {
    for (const [source, quote] of [
      [documents.profile, finding.profileQuote],
      [documents.job, finding.jobQuote],
      [preferencesText(documents.preferences), finding.preferencesQuote],
    ] as const) {
      if (quote && !resolveQuote(source, quote)) {
        errors.push(`invalid-quote:${finding.subject}`);
      }
    }

    if (
      (category === "matches" || category === "gaps") &&
      (!finding.jobQuote || !(finding.profileQuote || finding.preferencesQuote))
    ) {
      errors.push(`missing-proof:${finding.subject}`);
    }
  }

  return { passed: errors.length === 0, errors, rows };
}
