import test from "node:test";
import assert from "node:assert/strict";
import { passesEvaluation } from "../scripts/lib/evaluation.ts";
import type {
  AnalysisResult,
  Finding,
  Relation,
} from "../src/server/domain/models.ts";

function finding(subject: string, relation: Relation): Finding {
  return {
    subject,
    explanation: "Fictif",
    interpretation: {
      relation,
      describedPractice: "Pratique citée",
      justification: "Fictif",
    },
    evidenceState: "insufficient_information",
    verification: null,
    profileQuote: "Fictif",
    preferencesQuote: null,
    jobQuote: "Fictif",
  };
}

await test("Evaluation accepts complete atomic decomposition but rejects global matches, missing requirements and swapped relations", () => {
  const alternative = [
    { subjectPattern: "unitaires", relation: "equivalence" as const },
    {
      subjectPattern: "intégration",
      relation: "insufficient_information" as const,
    },
  ];

  const result: AnalysisResult = {
    matches: [finding("Tests unitaires", "equivalence")],
    unknowns: [finding("Tests d’intégration", "insufficient_information")],
    gaps: [],
    needsReview: [],
  };

  assert.equal(
    passesEvaluation(result, "indirect_evidence", alternative),
    true,
  );
  assert.equal(
    passesEvaluation(
      { ...result, unknowns: [] },
      "indirect_evidence",
      alternative,
    ),
    false,
  );
  assert.equal(
    passesEvaluation(
      {
        ...result,
        matches: [finding("Tests d’intégration", "equivalence")],
        unknowns: [finding("Tests unitaires", "insufficient_information")],
      },
      "indirect_evidence",
      alternative,
    ),
    false,
  );
  assert.equal(
    passesEvaluation(
      {
        ...result,
        matches: [finding("Tests unitaires et d’intégration", "equivalence")],
        unknowns: [],
      },
      "indirect_evidence",
      alternative,
    ),
    false,
  );
});

await test("Evaluation distinguishes a contradiction in gaps from a contradiction misfiled in unknowns", () => {
  const gap = finding("Salaire", "contradiction");

  const result: AnalysisResult = {
    matches: [],
    unknowns: [],
    gaps: [gap],
    needsReview: [],
  };

  assert.equal(passesEvaluation(result, "contradiction"), true);
  assert.equal(
    passesEvaluation({ ...result, gaps: [], unknowns: [gap] }, "contradiction"),
    false,
  );
});
