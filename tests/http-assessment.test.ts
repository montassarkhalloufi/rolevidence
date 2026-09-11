import test from "node:test";
import assert from "node:assert/strict";
import { assess } from "../scripts/lib/http-assessment.ts";
import type { AnalysisResult, Finding } from "../src/server/domain/models.ts";

const documents = {
  profile: "API TypeScript en production.",
  job: "TypeScript requis.",
};

const finding: Finding = {
  subject: "TypeScript",
  explanation: "Fictif",
  interpretation: {
    relation: "equivalence",
    describedPractice: documents.profile,
    justification: "Fictif",
  },
  evidenceState: "supported",
  verification: null,
  profileQuote: documents.profile,
  jobQuote: documents.job,
  preferencesQuote: null,
};

const expected = [
  { subjectPattern: "TypeScript", category: "matches" as const },
];

const result: AnalysisResult = {
  matches: [finding],
  gaps: [],
  unknowns: [],
  needsReview: [],
};

await test("API assessment rejects fabricated evidence, unsupported conclusions and extra invented criteria", () => {
  assert.equal(assess(result, expected, documents).passed, true);
  assert.equal(
    assess(
      {
        ...result,
        matches: [{ ...finding, profileQuote: "Maîtrise de Java." }],
      },
      expected,
      documents,
    ).passed,
    false,
  );
  assert.equal(
    assess(
      { ...result, matches: [{ ...finding, profileQuote: null }] },
      expected,
      documents,
    ).passed,
    false,
  );
  assert.equal(
    assess(
      { ...result, unknowns: [{ ...finding, subject: "Salaire" }] },
      expected,
      documents,
    ).passed,
    false,
  );
});

await test("API assessment rejects omitted and misclassified atomic criteria", () => {
  assert.equal(
    assess(
      result,
      [...expected, { subjectPattern: "Java", category: "unknowns" }],
      documents,
    ).passed,
    false,
  );
  assert.equal(
    assess({ ...result, matches: [], gaps: [finding] }, expected, documents)
      .passed,
    false,
  );
});
