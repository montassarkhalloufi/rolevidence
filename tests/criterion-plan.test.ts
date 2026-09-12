import test from "node:test";
import assert from "node:assert/strict";
import { planCriteria } from "../src/server/adapters/models/criterion-plan.ts";
import { compareComplete } from "../src/server/adapters/models/complete-comparison.ts";
import { createSourceCatalog } from "../src/server/adapters/openai/sources.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";

const selection = { provider: "openai" as const, model: "fake" };

const metadata = {
  model: "fake",
  responseId: "fake",
  durationMs: 1,
  inputTokens: 1,
  outputTokens: 1,
};

const documents = {
  profile: "Camille utilise Node.js.",
  job: "Node.js requis.\nPratique de Node.js exigée.\nJava requis.",
};

const catalog = createSourceCatalog(documents);

const planned = {
  criteria: [
    { subject: "Node.js", sourceIds: ["J1", "J2"] },
    { subject: "Java", sourceIds: ["J3"] },
  ],
  warnings: [],
};

await test("canonical criteria retain all original evidence and compare each atom once", async () => {
  const plan = await planCriteria(
    async (request) => {
      assert.doesNotMatch(JSON.stringify(request.messages), /Camille/);

      return { value: planned, metadata };
    },
    catalog.job,
    selection,
  );

  assert.equal(plan.passages.length, 2);
  const comparison = await compareComplete(
    async (request) => {
      const item = {
        subject: "Node.js",
        explanation: "Pratique",
        interpretation: {
          relation: "equivalence",
          describedPractice: documents.profile,
          justification: "Pratique déclarée",
        },
        candidateInformation: "provided",
        candidateSource: "profile",
        profileEvidenceId: "P1",
        profileEvidenceQuote: documents.profile,
        preferencesEvidenceId: null,
        educationComparison: null,
        experienceComparison: null,
      };

      const value = {
        J1: [item],
        J2: [
          {
            ...item,
            subject: "Java",
            candidateInformation: "not_provided",
            profileEvidenceQuote: null,
            profileEvidenceId: null,
            interpretation: {
              relation: "insufficient_information",
              describedPractice: null,
              justification: "Non précisé",
            },
          },
        ],
      };

      assert.equal(
        request.schema.safeParse({ ...value, J1: [item, item] }).success,
        false,
      );

      return { value, metadata };
    },
    documents,
    { ...catalog, job: plan.passages },
    selection,
  );

  const result = classifyRequirements(comparison.extraction, documents);

  assert.equal(result.matches.length, 1);
  assert.equal(result.unknowns.length, 1);
  assert.deepEqual(result.matches[0]?.jobQuotes, [
    "Node.js requis.",
    "Pratique de Node.js exigée.",
  ]);
});

await test("planning omissions and forged references fail without comparison or retry", async () => {
  for (const value of [
    { ...planned, criteria: planned.criteria.slice(0, 1) },
    { ...planned, criteria: [{ subject: "Inventé", sourceIds: ["J999"] }] },
    {
      ...planned,
      warnings: [{ explanation: "Ambiguïté", sourceIds: ["J1", "J999"] }],
    },
  ]) {
    let calls = 0;

    await assert.rejects(
      planCriteria(
        async () => {
          calls++;

          return { value, metadata };
        },
        catalog.job,
        selection,
      ),
    );
    assert.equal(calls, 1);
  }
});

await test("different duration thresholds remain independently cited with a source warning", async () => {
  const passages = [
    { id: "J1", text: "3 ans exigés." },
    { id: "J2", text: "12 mois exigés." },
  ];

  const plan = await planCriteria(
    async () => ({
      value: {
        criteria: passages.map(({ id, text }) => ({
          subject: text,
          sourceIds: [id],
        })),
        warnings: [
          {
            explanation: "Seuils différents à confirmer.",
            sourceIds: ["J1", "J2"],
          },
        ],
      },
      metadata,
    }),
    passages,
    selection,
  );

  assert.equal(plan.passages.length, 2);
  assert.deepEqual(
    plan.warnings[0]?.quotes,
    passages.map(({ text }) => text),
  );
});
