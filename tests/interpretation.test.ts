import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type { ExtractionResult } from "../src/server/domain/models.ts";

const requirement: ExtractionResult["requirements"][number] = {
  subject: "Node.js",
  explanation: "À confirmer.",
  candidateInformation: "provided",
  candidateSource: "profile",
  interpretation: {
    describedPractice: "API NestJS",
    relation: "indirect_evidence",
    justification: "NestJS suggère Node.js sans établir la maîtrise demandée.",
  },
  profileQuote: "API avec NestJS.",
  jobQuote: "Maîtrise Node.js.",
  preferencesQuote: null,
};

await test("Une interprétation indirecte reste inconnue même avec deux citations exactes", () => {
  const result = classifyRequirements(
    { requirements: [requirement] },
    { profile: "API avec NestJS.", job: "Maîtrise Node.js." },
  );

  assert.equal(result.unknowns.length, 1);
  assert.equal(result.matches.length, 0);
  assert.equal(
    result.unknowns[0]?.interpretation.relation,
    "indirect_evidence",
  );
});
await test("Citation JavaScript présente ne suffit pas : la relation sémantique pilote le classement", () => {
  const result = classifyRequirements(
    {
      requirements: [
        {
          ...requirement,
          subject: "Java",
          interpretation: {
            describedPractice: "Développement JavaScript",
            relation: "insufficient_information",
            justification: "Langages distincts.",
          },
          profileQuote: "Développement JavaScript.",
          jobQuote: "Java requis.",
        },
      ],
    },
    { profile: "Développement JavaScript.", job: "Java requis." },
  );

  assert.equal(result.unknowns.length, 1);
  assert.equal(result.matches.length, 0);
});
