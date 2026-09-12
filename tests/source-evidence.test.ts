import test from "node:test";
import assert from "node:assert/strict";
import { createSourceCatalog } from "../src/server/adapters/openai/sources.ts";
import { createExtractionSchema } from "../src/server/adapters/openai/extraction.ts";
import { mapExtraction } from "../src/server/adapters/openai/map-extraction.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type { Requirement } from "../src/server/domain/models.ts";

const documents = {
  profile:
    "Camille développe des API TypeScript et Node.js.\nStack : PostgreSQL, Redis.",
  job: "# Offre fictive\n- Bonne pratique de Java, TypeScript, Node.js et PostgreSQL.\n- Salaire : non communiqué.",
};

const catalog = createSourceCatalog(documents);

const item = {
  subject: "TypeScript",
  explanation: "Pratique déclarée.",
  interpretation: {
    relation: "equivalence" as const,
    describedPractice: "API TypeScript",
    justification: "Usage explicite.",
  },
  candidateInformation: "provided" as const,
  candidateSource: "profile" as const,
  profileEvidenceId: "P1",
  profileEvidenceQuote: "Camille développe des API TypeScript et Node.js.",
  preferencesEvidenceId: null,
  jobEvidenceId: "J2",
  experienceComparison: null,
};

await test("Source references preserve the shared job sentence and exact profile text", () => {
  const parsed = createExtractionSchema(catalog).parse({
    requirements: [
      item,
      { ...item, subject: "Node.js" },
      {
        ...item,
        subject: "PostgreSQL",
        profileEvidenceId: "P2",
        profileEvidenceQuote: "Stack : PostgreSQL, Redis.",
      },
    ],
  });

  const extraction = mapExtraction(parsed, catalog);

  const result = classifyRequirements(extraction, documents);

  assert.equal(result.matches.length, 3);
  assert.equal(
    result.matches[0]?.jobQuote,
    "- Bonne pratique de Java, TypeScript, Node.js et PostgreSQL.",
  );
  assert.equal(result.matches[2]?.profileQuote, "Stack : PostgreSQL, Redis.");
  assert.equal(result.needsReview.length, 0);
  assert.equal(result.unknowns[0]?.jobQuote, "- Salaire : non communiqué.");
  assert.equal(result.unknowns.length, 1);
});

await test("Invented references, free-form quotes and cross-source references are rejected", () => {
  const schema = createExtractionSchema(catalog);

  for (const modified of [
    { ...item, profileEvidenceId: "P999" },
    { ...item, jobEvidenceId: "Bonne pratique de TypeScript" },
    { ...item, profileEvidenceId: "J2" },
    { ...item, profileQuote: "Stack : ... PostgreSQL ..." },
  ]) {
    assert.equal(schema.safeParse({ requirements: [modified] }).success, false);
  }
});

const experience: Requirement = {
  subject: "Ancienneté backend",
  explanation: "Conclusion proposée.",
  interpretation: {
    relation: "contradiction",
    describedPractice: "Ancienneté",
    justification: "Comparaison proposée.",
  },
  candidateInformation: "provided",
  candidateSource: "profile",
  profileQuote: "9+ ans d’expérience fullstack.",
  jobQuote: "Au moins 12 ans backend.",
  preferencesQuote: null,
  experienceComparison: {
    comparableScope: false,
    candidateDuration: "lower_bound",
  },
};

await test("A lower bound or different experience scope cannot establish a definite gap", () => {
  for (const comparison of [
    experience.experienceComparison,
    { comparableScope: true, candidateDuration: "exact" as const },
  ]) {
    const result = classifyRequirements(
      {
        requirements: [
          { ...experience, experienceComparison: comparison ?? null },
        ],
      },
      {
        profile: experience.profileQuote ?? "",
        job: experience.jobQuote ?? "",
      },
    );

    assert.equal(result.gaps.length, 0);
    assert.equal(
      result.unknowns[0]?.interpretation.relation,
      "insufficient_information",
    );
  }
});

await test("Exact comparable backend durations retain a supported contradiction", () => {
  const requirement: Requirement = {
    ...experience,
    profileQuote: "6 ans backend.",
    experienceComparison: { comparableScope: true, candidateDuration: "exact" },
  };

  const result = classifyRequirements(
    { requirements: [requirement] },
    { profile: "6 ans backend.", job: "Au moins 12 ans backend." },
  );

  assert.equal(result.gaps.length, 1);
});

await test("An absent described practice cannot become a gap even if the model marks it provided", () => {
  const requirement: Requirement = {
    ...experience,
    subject: "Java",
    profileQuote: "JavaScript, TypeScript.",
    jobQuote: "Java requis.",
    experienceComparison: null,
    interpretation: {
      describedPractice: null,
      relation: "contradiction",
      justification: "Absence interprétée à tort.",
    },
  };

  const result = classifyRequirements(
    { requirements: [requirement] },
    { profile: "JavaScript, TypeScript.", job: "Java requis." },
  );

  assert.equal(result.gaps.length, 0);
  assert.equal(
    result.unknowns[0]?.verification?.code,
    "MISSING_CANDIDATE_INFORMATION",
  );
});

await test("Source passages retain complete sentences across extracted PDF line breaks", () => {
  const profile =
    "Expérience fullstack.\nDéveloppement frontend React/TypeScript et backend\nNode.js/NestJS en production.";

  const sources = createSourceCatalog({ profile, job: "Node.js requis." });

  assert.equal(
    sources.profile[1]?.text,
    "Développement frontend React/TypeScript et backend\nNode.js/NestJS en production.",
  );
  for (const passage of sources.profile) {
    assert.equal(profile.includes(passage.text), true);
  }
});

await test("An adjacent profile ID is repaired only with an exact quote; invented text is not accepted", () => {
  const corrected = createExtractionSchema(catalog).parse({
    requirements: [{ ...item, profileEvidenceId: "P2" }],
  });

  const mapped = mapExtraction(corrected, catalog);

  assert.equal(
    mapped.requirements[0]?.profileQuote,
    "Camille développe des API TypeScript et Node.js.",
  );

  const invented = createExtractionSchema(catalog).parse({
    requirements: [
      { ...item, profileEvidenceQuote: "Stack : ... PostgreSQL ..." },
    ],
  });

  const result = classifyRequirements(
    mapExtraction(invented, catalog),
    documents,
  );

  assert.equal(result.matches.length, 0);
  assert.equal(result.needsReview[0]?.verification?.code, "UNVERIFIED_QUOTES");
});

await test("Quotes spanning catalog passages are verified against the original CV", () => {
  const parsed = createExtractionSchema(catalog).parse({
    requirements: [{ ...item, profileEvidenceQuote: documents.profile }],
  });

  const result = classifyRequirements(
    mapExtraction(parsed, catalog),
    documents,
  );

  assert.equal(result.matches[0]?.profileQuote, documents.profile);
});

await test("Rejected provider quotes remain available for diagnosis, never as verified evidence", () => {
  const proposed = "Camille maîtrise PostgreSQL depuis dix ans.";

  const parsed = createExtractionSchema(catalog).parse({
    requirements: [{ ...item, profileEvidenceQuote: proposed }],
  });

  const result = classifyRequirements(
    mapExtraction(parsed, catalog),
    documents,
  );

  assert.equal(result.matches.length, 0);
  assert.equal(result.needsReview[0]?.profileQuote, null);
  assert.equal(
    result.needsReview[0]?.verification?.proposedCandidateQuote,
    proposed,
  );
  assert.deepEqual(result.needsReview[0]?.verification?.missingQuotes, [
    "candidate",
  ]);
});

await test("The offer summary uses the original requirement instead of an inflated model paraphrase", () => {
  const parsed = createExtractionSchema(catalog).parse({
    requirements: [
      {
        ...item,
        explanation: "Maîtrise avancée exigée avec dix ans de production.",
      },
    ],
  });

  const mapped = mapExtraction(parsed, catalog);

  assert.equal(
    mapped.requirements[0]?.explanation,
    "- Bonne pratique de Java, TypeScript, Node.js et PostgreSQL.",
  );
});

await test("missing accents are not typographic equivalence for candidate evidence", () => {
  const source =
    "Développement React et Node.js ; contribution à l’optimisation.";

  const input = { profile: source, job: "Pratique de React exigée." };

  const sources = createSourceCatalog(input);

  const extraction = createExtractionSchema(sources).parse({
    requirements: [
      {
        ...item,
        profileEvidenceId: "P1",
        jobEvidenceId: "J1",
        profileEvidenceQuote:
          "Dveloppement React et Node.js ; contribution l’optimisation.",
      },
    ],
  });

  const result = classifyRequirements(
    mapExtraction(extraction, sources),
    input,
  );

  assert.equal(result.matches.length, 0);
  assert.equal(result.needsReview.length, 1);
  assert.equal(result.needsReview[0]?.profileQuote, null);
});
