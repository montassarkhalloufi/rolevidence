import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type { Requirement } from "../src/server/domain/models.ts";

await test("Training-only evidence cannot establish an explicit production gap; a personal never statement can", () => {
  const job = "Déploiement RAG en production exigé.";

  for (const [profile, bucket] of [
    ["Formation RAG ; exercices pédagogiques uniquement.", "unknowns"],
    ["Je n’ai jamais déployé de RAG en production.", "gaps"],
  ] as const) {
    const requirement: Requirement = {
      subject: "RAG",
      explanation: "Affirmation modèle",
      interpretation: {
        relation: "contradiction",
        describedPractice: profile,
        justification: "Le modèle conclut à un écart.",
      },
      candidateSource: "profile",
      candidateInformation: "provided",
      profileQuote: profile,
      preferencesQuote: null,
      jobQuote: job,
    };

    const result = classifyRequirements(
      { requirements: [requirement] },
      { profile, job },
    );

    assert.equal(result[bucket].length, 1);
    if (bucket === "unknowns") {
      assert.doesNotMatch(
        result.unknowns[0]?.interpretation.justification ?? "",
        /Le modèle conclut/,
      );
    }
  }
});
