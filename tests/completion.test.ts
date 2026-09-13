import { draftKey } from "../src/client/features/case-files/draft-key.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { compareComplete } from "../src/server/adapters/models/complete-comparison.ts";
import { createSourceCatalog } from "../src/server/adapters/models/sources.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import { createCaseFileRepository } from "../src/server/infrastructure/persistence/case-files.ts";
import { openDatabase } from "../src/server/infrastructure/persistence/database.ts";
import { emptyPreferences } from "../src/shared/analysis.ts";
import { renderReport } from "../src/client/features/exports/report.ts";

const metadata = {
  model: "fake",
  responseId: "fake",
  durationMs: 1,
  inputTokens: 1,
  outputTokens: 1,
};

const unknown = {
  subject: "Exigence",
  explanation: "Non précisé",
  interpretation: {
    relation: "insufficient_information",
    describedPractice: null,
    justification: "Non précisé",
  },
  candidateInformation: "not_provided",
  candidateSource: "profile",
  profileEvidenceId: null,
  profileEvidenceQuote: null,
  preferencesEvidenceId: null,
  educationComparison: null,
  experienceComparison: null,
};

await test("comparison batches require every retained passage; invalid omissions fail without repair calls", async () => {
  const documents = {
    profile: "Camille utilise JavaScript.",
    job: Array.from({ length: 9 }, (_, i) => `Exigence ${i}`).join("\n"),
  };

  let calls = 0;

  const catalog = createSourceCatalog(documents);

  const output = await compareComplete(
    async (request) => {
      calls++;
      const content = JSON.parse(request.messages[1]?.content ?? "{}") as {
        job: { id: string }[];
      };

      return {
        value: Object.fromEntries(content.job.map(({ id }) => [id, [unknown]])),
        metadata,
      };
    },
    documents,
    catalog,
    { provider: "openai", model: "fake" },
  );

  assert.equal(calls, 2);
  assert.equal(output.extraction.requirements.length, 9);
  assert.equal(output.extraction.unassessedJobQuotes.length, 0);
  let invalidCalls = 0;

  await assert.rejects(
    compareComplete(
      async () => {
        invalidCalls++;

        return { value: {}, metadata };
      },
      documents,
      catalog,
      { provider: "openai", model: "fake" },
    ),
  );
  assert.equal(invalidCalls, 1);
});

await test("clarifications have separate verified citations and cannot invent facts", () => {
  const documents = {
    profile: "Camille utilise JavaScript.",
    job: "Java requis.",
    clarifications: "Déclaration du candidat : Java en production depuis 2020.",
  };

  const requirement = {
    subject: "Java",
    explanation: "Pratique déclarée",
    interpretation: {
      relation: "equivalence" as const,
      describedPractice: "Java en production",
      justification: "Déclaration",
    },
    candidateSource: "clarification" as const,
    candidateInformation: "provided" as const,
    profileQuote: null,
    preferencesQuote: null,
    clarificationQuote: "Java en production depuis 2020.",
    jobQuote: "Java requis.",
  };

  const result = classifyRequirements(
    { requirements: [requirement] },
    documents,
  );

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.profileQuote, null);
  assert.equal(
    result.matches[0]?.clarificationQuote,
    requirement.clarificationQuote,
  );
  const invalid = classifyRequirements(
    {
      requirements: [
        { ...requirement, clarificationQuote: "Expert Java depuis 15 ans." },
      ],
    },
    documents,
  );

  assert.equal(invalid.matches.length, 0);
  assert.equal(invalid.needsReview.length, 1);
});

await test("backup restoration preserves snapshots, isolates copies and rejects inconsistent sources", () => {
  const db = openDatabase(":memory:");

  try {
    const repo = createCaseFileRepository(db);

    const saved = repo.save(
      randomUUID(),
      {
        title: "<script>alert(1)</script>",
        purpose: "job_search",
        documents: {
          profile: "Camille",
          job: "Java",
          preferences: emptyPreferences,
          clarifications: "Déclaration datée",
        },
        selection: { provider: "openai", model: "fake" },
        offerSource: null,
      },
      0,
    );

    const analysis = repo.append(
      saved,
      {
        analysis: { matches: [], gaps: [], unknowns: [], needsReview: [] },
        metadata,
      },
      randomUUID(),
    );

    const backup = repo.backup(saved.id);

    const restored = repo.restore(backup);

    assert.notEqual(restored.id, saved.id);
    assert.deepEqual(restored.documents, saved.documents);
    const restoredAnalysis = repo.analyses(restored.id, 0, 10).items[0];

    assert.deepEqual(restoredAnalysis?.result, analysis.result);
    assert.deepEqual(restoredAnalysis?.snapshot.documents, saved.documents);
    assert.equal(restoredAnalysis?.snapshot.id, restored.id);
    assert.throws(() =>
      repo.restore({
        ...backup,
        analyses: [{ ...analysis, dossierId: randomUUID() }],
      }),
    );
    assert.equal(repo.list("", 0, 10).total, 2);
    repo.delete(restored.id, restored.revision);
    assert.equal(repo.analyses(saved.id, 0, 10).total, 1);
    const html = renderReport(analysis);

    assert(!html.includes("<script>"));
    assert(html.includes("&#60;script&#62;"));
    assert(html.includes("Content-Security-Policy"));
    assert(html.includes("Déclaration datée"));
  } finally {
    db.close();
  }
});

await test("spurious model duration metadata cannot downgrade a technology criterion", () => {
  const profile = "Camille développe des API TypeScript depuis quatre ans.";

  const result = classifyRequirements(
    {
      requirements: [
        {
          subject: "TypeScript",
          explanation: "Pratique",
          candidateSource: "profile",
          candidateInformation: "provided",
          profileQuote: profile,
          jobQuote: "Bonne pratique de TypeScript requise.",
          preferencesQuote: null,
          educationComparison: null,
          experienceComparison: {
            comparableScope: false,
            candidateDuration: "unknown",
          },
          interpretation: {
            relation: "equivalence",
            describedPractice: "API TypeScript",
            justification: "Pratique déclarée",
          },
        },
      ],
    },
    { profile, job: "Bonne pratique de TypeScript requise." },
  );

  assert.equal(result.matches.length, 1);
});

await test("saved drafts compare content independently of JSON property order", () => {
  assert.equal(
    draftKey({ documents: { profile: "CV", clarifications: "answer" } }),
    draftKey({ documents: { clarifications: "answer", profile: "CV" } }),
  );
  assert.notEqual(
    draftKey({ documents: { profile: "CV", clarifications: "answer" } }),
    draftKey({ documents: { profile: "CV", clarifications: "new answer" } }),
  );
});
