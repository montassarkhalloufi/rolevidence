import { request as httpRequest } from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { openDatabase } from "../src/server/infrastructure/persistence/database.ts";
import { createCaseFileRepository } from "../src/server/infrastructure/persistence/case-files.ts";
import { createJobRepository } from "../src/server/infrastructure/persistence/jobs.ts";
import { createJobRunner } from "../src/server/application/jobs.ts";
import type { JobRecord } from "../src/server/application/jobs.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { createApp } from "../src/server/infrastructure/http/app.ts";
import { emptyPreferences } from "../src/shared/analysis.ts";
import type {
  CaseFileDraftData,
  SavedAnalysisData,
} from "../src/shared/case-files.ts";
import { renderReport } from "../src/client/features/exports/report.ts";
import { findingSummary } from "../src/client/features/analysis/finding-summary.ts";
import { fr } from "../src/client/shared/i18n/fr.ts";

const draft: CaseFileDraftData = {
  title: "Fictional review case",
  purpose: "job_search",
  documents: {
    profile: "Fictional TypeScript experience.",
    job: "TypeScript required.",
    preferences: emptyPreferences,
  },
  selection: { provider: "openai", model: "fake" },
  offerSource: null,
};

function setup() {
  const db = openDatabase(":memory:");

  const caseFiles = createCaseFileRepository(db);

  const saved = caseFiles.save(randomUUID(), draft, 0);

  let calls = 0;

  const service = createAnalysisService("fake", async () => ({
    extraction: { requirements: [] },
    metadata: {
      model: "fake",
      responseId: `fictional-${++calls}`,
      durationMs: 1,
      inputTokens: 0,
      outputTokens: 0,
    },
  }));

  return { db, caseFiles, saved, service, calls: () => calls };
}

async function serve(
  context: ReturnType<typeof setup>,
  action: (url: string) => Promise<void>,
) {
  const server = createApp({
    ...context,
    readDocuments: async () => draft.documents,
    model: "fake",
    configured: true,
  }).listen(0, "127.0.0.1");

  await once(server, "listening");
  try {
    const address = server.address();

    assert.ok(address && typeof address !== "string");
    await action(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

await test("reject foreign or malformed Host headers before reads, mutations and static files", async () => {
  const context = setup();

  try {
    await serve(context, async (url) => {
      for (const host of [
        "attacker.example",
        "localhost.attacker.example",
        "127.0.0.1.attacker.example",
        "attacker.example:3000",
        "localhost@attacker.example",
        "localhost,attacker.example",
      ]) {
        for (const route of [
          "/api/v1/dossiers",
          "/api/v1/dossiers/" + context.saved.id,
          "/",
        ]) {
          const response = await requestWithHost(url + route, host);

          assert.equal(response.status, 403);
          assert.equal((await response.json()).code, "FORBIDDEN");
        }

        const mutation = await requestWithHost(
          url + "/api/v1/analyses",
          host,
          "POST",
        );

        assert.equal(mutation.status, 403);
      }

      for (const host of [
        "localhost",
        "localhost:3000",
        "127.0.0.1:3000",
        "[::1]:3000",
      ]) {
        assert.equal(
          (await requestWithHost(url + "/api/v1/dossiers", host)).status,
          200,
        );
      }

      assert.equal(context.calls(), 0);
    });
  } finally {
    context.db.close();
  }
});

await test("fresh idempotency cache stores each new execution; replay still shares one snapshot", async () => {
  const context = setup();

  try {
    for (let execution = 1; execution <= 2; execution++) {
      await serve(context, async (url) => {
        for (let replay = 0; replay <= 1; replay++) {
          const response = await fetch(url + "/api/v1/analyses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Rolevidence": "1",
              "Idempotency-Key": "fictional-shared-key",
            },
            body: JSON.stringify({
              ...draft.documents,
              selection: draft.selection,
              dossierId: context.saved.id,
              dossierRevision: 1,
            }),
          });

          assert.equal(response.status, 200);
          assert.equal(
            response.headers.get("Idempotency-Replayed"),
            String(Boolean(replay)),
          );
          assert.equal(
            (await response.json()).metadata.responseId,
            `fictional-${execution}`,
          );
        }
      });
    }

    assert.equal(context.calls(), 2);
    const history = context.caseFiles.analyses(context.saved.id, 0, 10);

    assert.equal(history.total, 2);
    assert.deepEqual(
      new Set(history.items.map((item) => item.result.metadata.responseId)),
      new Set(["fictional-1", "fictional-2"]),
    );
  } finally {
    context.db.close();
  }
});

await test("latest job follows an older resumed execution and its completion", async () => {
  const context = setup();

  const repository = createJobRepository(context.db);

  const makeJob = (timestamp: string): JobRecord => ({
    id: randomUUID(),
    dossierId: context.saved.id,
    revision: 1,
    snapshot: context.saved,
    status: "cancelled",
    progress: { stage: "preparation", completed: 0, total: 2 },
    createdAt: timestamp,
    updatedAt: timestamp,
    attempt: 1,
    error: "Fictional cancellation",
    result: null,
    checkpoint: null,
  });

  const older = makeJob("2026-01-01T00:00:00.000Z");

  const newer = makeJob("2026-01-02T00:00:00.000Z");

  repository.put(older);
  repository.put(newer);
  const finished = Promise.withResolvers<void>();

  const service = {
    ...context.service,
    analyze: async () => {
      await finished.promise;

      return context.service.analyze(draft.documents);
    },
  };

  const runner = createJobRunner(
    repository,
    context.caseFiles,
    () => service,
    () => "2026-01-03T00:00:00.000Z",
  );

  try {
    runner.resume(older.id, 1);
    assert.equal(runner.latest(context.saved.id)?.id, older.id);
    assert.equal(runner.latest(context.saved.id)?.status, "running");
    finished.resolve();
    // Drain the finite execution without cancelling it.
    while (runner.isBusy()) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    assert.equal(runner.latest(context.saved.id)?.id, older.id);
    assert.equal(runner.latest(context.saved.id)?.status, "completed");
  } finally {
    finished.resolve();
    await runner.shutdown();
    context.db.close();
  }
});

await test("failed terminal storage is exposed as interrupted and resumes in the same process", async () => {
  const context = setup();

  const repository = createJobRepository(context.db);

  let failWrites = false;

  let first = true;

  const service = {
    ...context.service,
    analyze: async (...args: Parameters<typeof context.service.analyze>) => {
      if (first) {
        first = false;
        failWrites = true;
      }

      args[2]?.onProgress({ stage: "comparison", completed: 0, total: 1 });

      return context.service.analyze(...args);
    },
  };

  const runner = createJobRunner(
    {
      ...repository,
      put: (job) => {
        if (failWrites) {
          throw new Error("Simulated disk failure");
        }

        repository.put(job);
      },
    },
    context.caseFiles,
    () => service,
    () => new Date().toISOString(),
  );

  try {
    const job = runner.start(randomUUID(), context.saved.id, 1);

    while (runner.isBusy()) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    assert.equal(repository.get(job.id).status, "running");
    assert.equal(runner.get(job.id).status, "interrupted");
    assert.equal(runner.latest(context.saved.id)?.status, "interrupted");
    assert.equal(context.calls(), 0);
    failWrites = false;
    const newer = runner.start(randomUUID(), context.saved.id, 1);

    while (runner.isBusy()) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    assert.equal(runner.latest(context.saved.id)?.id, newer.id);
    assert.equal(runner.latest(context.saved.id)?.status, "completed");
    runner.resume(job.id, 1);
    while (runner.isBusy()) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    assert.equal(runner.get(job.id).status, "completed");
    assert.equal(runner.get(job.id).attempt, 2);
    assert.equal(context.calls(), 2);
  } finally {
    await runner.shutdown();
    context.db.close();
  }
});

await test("reports share retained summaries and label rejected reasoning as diagnostics", async () => {
  const context = setup();

  try {
    const result = await context.service.analyze(draft.documents);

    const finding = {
      subject: "Java",
      explanation: "The candidate meets the requirement.",
      interpretation: {
        relation: "equivalence" as const,
        describedPractice: null,
        justification: "Unsupported model reasoning",
      },
      evidenceState: "insufficient_information" as const,
      verification: {
        code: "MISSING_CANDIDATE_INFORMATION" as const,
        missingQuotes: ["candidate" as const],
        proposedCandidateQuote: null,
        proposedJobQuote: "Java",
      },
      profileQuote: null,
      preferencesQuote: null,
      jobQuote: null,
    };

    result.analysis.unknowns.push(finding);
    const saved: SavedAnalysisData = {
      id: randomUUID(),
      dossierId: context.saved.id,
      snapshot: context.saved,
      createdAt: context.saved.createdAt,
      result,
    };

    const html = renderReport(saved);

    const diagnosis = html.indexOf("<details>");

    assert.ok(html.slice(0, diagnosis).includes(findingSummary(finding)));
    assert.ok(!html.slice(0, diagnosis).includes(finding.explanation));
    assert.ok(html.includes(`<summary>${fr.originalModelReasoning}</summary>`));
    assert.ok(html.includes(finding.explanation));
  } finally {
    context.db.close();
  }
});

function requestWithHost(
  url: string,
  host: string,
  method = "GET",
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        method,
        headers: {
          Host: host,
          "X-Rolevidence": "1",
          "Content-Type": "application/json",
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () =>
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode ?? 500,
            }),
          ),
        );
      },
    );

    request.on("error", reject);
    request.end(method === "POST" ? "{}" : undefined);
  });
}
