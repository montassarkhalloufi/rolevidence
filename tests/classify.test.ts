import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type { ExtractionResult } from "../src/server/domain/models.ts";

const documents = {
  profile: "6 ans de backend. Anglais : non renseigné.",
  job: "12 ans de backend. Anglais professionnel. Java requis.",
};

const base: ExtractionResult["requirements"][number] = {
  subject: "Anglais",
  explanation: "Conclusion modèle",
  interpretation: {
    describedPractice: "Pratique fictive",
    relation: "contradiction",
    justification: "Justification de test",
  },
  candidateInformation: "not_provided",
  candidateSource: "profile",
  profileQuote: "Anglais : non renseigné.",
  jobQuote: "Anglais professionnel.",
  preferencesQuote: null,
};

await test("Anglais absent et Java sans preuve ne deviennent jamais des écarts", () => {
  const result = classifyRequirements(
    {
      requirements: [
        base,
        {
          ...base,
          subject: "Java",
          candidateInformation: "provided",
          profileQuote: null,
          jobQuote: "Java requis.",
        },
      ],
    },
    documents,
  );

  assert.equal(result.gaps.length, 0);
  assert.equal(result.unknowns.length, 1);
  assert.equal(result.needsReview.length, 1);
  assert.equal(
    result.unknowns[0]?.verification?.code,
    "MISSING_CANDIDATE_INFORMATION",
  );
});
await test("Écart explicite conservé ; citation inventée neutralisée", () => {
  const requirement = {
    ...base,
    subject: "Expérience",
    candidateInformation: "provided" as const,
    profileQuote: "6 ans de backend.",
    jobQuote: "12 ans de backend.",
  };

  assert.equal(
    classifyRequirements({ requirements: [requirement] }, documents).gaps
      .length,
    1,
  );
  const invalid = classifyRequirements(
    { requirements: [{ ...requirement, profileQuote: "Aucune expérience." }] },
    documents,
  );

  assert.equal(invalid.needsReview.length, 1);
  assert.equal(invalid.needsReview[0]?.profileQuote, null);
});
await test("Préférences : une citation du CV ne peut pas soutenir une condition de travail", () => {
  const result = classifyRequirements(
    {
      requirements: [
        {
          ...base,
          candidateSource: "preferences",
          candidateInformation: "provided",
          interpretation: {
            describedPractice: "Préférence fictive",
            relation: "equivalence",
            justification: "Justification de test",
          },
          preferencesQuote: "100 % télétravail",
        },
      ],
    },
    documents,
  );

  assert.equal(result.matches.length, 0);
  assert.equal(result.needsReview[0]?.profileQuote, null);
});
