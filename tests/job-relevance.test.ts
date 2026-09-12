import { identityPlan } from "./plan-fixture.ts";
import test from "node:test";
import { createLangChainGateway } from "../src/server/adapters/models/gateway.ts";
import assert from "node:assert/strict";
import { createSourceCatalog } from "../src/server/adapters/openai/sources.ts";
import { createJobRelevance } from "../src/server/adapters/models/job-relevance.ts";

const passages = createSourceCatalog({
  profile: "Camille utilise TypeScript.",
  job: "Notre entreprise existe depuis 2003.\nÉcriture de tests unitaires exigée.\nAnglais professionnel requis.",
}).job;

const metadata = {
  model: "fake",
  responseId: "fake",
  durationMs: 1,
  inputTokens: 1,
  outputTokens: 1,
};

const unknownRequirement = {
  subject: "Exigence",
  explanation: "Information absente",
  interpretation: {
    relation: "insufficient_information",
    describedPractice: null,
    justification: "Information absente",
  },
  candidateInformation: "not_provided",
  candidateSource: "profile",
  profileEvidenceId: null,
  profileEvidenceQuote: null,
  preferencesEvidenceId: null,
  experienceComparison: null,
};

await test("job-only AI classification excludes explicit context and retains unclassified duties", async () => {
  const classify = createJobRelevance(async (request) => {
    assert.doesNotMatch(request.messages[1]?.content ?? "", /Camille/);

    return {
      value: {
        passages: [
          { id: "J1", kind: "company_background" },
          { id: "J2", kind: "candidate_criterion" },
        ],
      },
      metadata,
    };
  });

  const result = await classify(passages, {
    provider: "openai",
    model: "fake",
  });

  assert.deepEqual(result.contextPassages, [
    {
      quote: "Notre entreprise existe depuis 2003.",
      reason: "company_background",
    },
  ]);
  assert.deepEqual(
    result.passages.map((item) => item.id),
    ["J2", "J3"],
  );
});
await test("ambiguous duplicate classifications retain the source; invalid IDs reject", async () => {
  const classify = createJobRelevance(async () => ({
    value: {
      passages: [
        { id: "J2", kind: "heading" },
        { id: "J2", kind: "candidate_criterion" },
      ],
    },
    metadata,
  }));

  assert.equal(
    (await classify(passages, { provider: "openai", model: "fake" })).passages
      .length,
    3,
  );
  const invalid = createJobRelevance(async () => ({
    value: { passages: [{ id: "J999", kind: "heading" }] },
    metadata,
  }));

  await assert.rejects(
    invalid(passages, { provider: "openai", model: "fake" }),
  );
});

await test("gateway compares retained sources only, exposes omissions and totals both calls", async () => {
  const names: string[] = [];

  const gateway = createLangChainGateway("openai", async (request) => {
    names.push(request.name);
    if (request.name === "atomic_job_criteria") {
      return { value: identityPlan(request), metadata };
    }

    if (request.name === "job_passage_relevance") {
      return {
        value: { passages: [{ id: "J1", kind: "company_background" }] },
        metadata,
      };
    }

    assert.doesNotMatch(request.messages[1]?.content ?? "", /existe depuis/);
    assert.match(request.messages[1]?.content ?? "", /tests unitaires/);

    return {
      value: { J1: [unknownRequirement], J2: [unknownRequirement] },
      metadata,
    };
  });

  const result = await gateway({
    documents: {
      profile: "Camille utilise TypeScript.",
      job: passages.map((item) => item.text).join("\n"),
    },
    model: "fake",
  });

  assert.deepEqual(names, [
    "job_passage_relevance",
    "atomic_job_criteria",
    "requirements_evidence",
  ]);
  assert.equal(result.metadata.contextPassages?.length, 1);
  assert.equal(result.metadata.inputTokens, 3);
  assert.equal(result.metadata.durationMs, 3);
  assert.equal(result.extraction.unassessedJobQuotes?.length, 0);
});

await test("reviewed exact job passages are reintroduced without admitting invented text", async () => {
  const gateway = createLangChainGateway("openai", async (request) => {
    if (request.name === "atomic_job_criteria") {
      return { value: identityPlan(request), metadata };
    }

    if (request.name === "job_passage_relevance") {
      return {
        value: { passages: [{ id: "J1", kind: "company_background" }] },
        metadata,
      };
    }

    assert.match(request.messages[1]?.content ?? "", /existe depuis/);
    assert.doesNotMatch(
      request.messages[1]?.content ?? "",
      /Invented criterion/,
    );

    return {
      value: {
        J1: [unknownRequirement],
        J2: [unknownRequirement],
        J3: [unknownRequirement],
      },
      metadata,
    };
  });

  const result = await gateway({
    documents: {
      profile: "Camille utilise TypeScript.",
      job: passages.map((item) => item.text).join("\n"),
      reviewedJobQuotes: [
        "Notre entreprise existe depuis 2003.",
        "Invented criterion",
      ],
    },
    model: "fake",
  });

  assert.equal(result.extraction.requirements.length, 3);
  assert.deepEqual(result.metadata.contextPassages, []);
});

await test("interview logistics are context, conducting interviews remains a duty", async () => {
  const job =
    "Vous rencontrerez notre recruteuse puis le manager.\nVous conduirez les entretiens techniques des développeurs.";

  const sources = createSourceCatalog({ profile: "Camille", job }).job;

  const classify = createJobRelevance(async () => ({
    value: {
      passages: [
        { id: "J1", kind: "recruitment_process" },
        { id: "J2", kind: "candidate_criterion" },
      ],
    },
    metadata,
  }));

  const result = await classify(sources, { provider: "openai", model: "fake" });

  assert.deepEqual(result.passages, [sources[1]]);
  assert.equal(result.contextPassages[0]?.reason, "recruitment_process");
});

await test("identical job passages compare once, conflicting and distinct requirements survive", () => {
  const job =
    "Au moins 3 ans d’expérience.\nReact et Node.js requis.\nAu moins 3 ans d’expérience.\nexperienceRequirements: 12 mois\nJava requis.\nJavaScript requis.";

  const catalog = createSourceCatalog({ profile: "Camille", job });

  assert.deepEqual(
    catalog.job.map(({ id }) => id),
    ["J1", "J2", "J4", "J5", "J6"],
  );
  assert.equal(job.split("\n").length, 6);
});
