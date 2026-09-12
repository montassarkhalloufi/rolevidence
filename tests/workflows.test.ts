import { identityPlan } from "./plan-fixture.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { openDatabase } from "../src/server/infrastructure/persistence/database.ts";
import { createDossierRepository } from "../src/server/infrastructure/persistence/dossiers.ts";
import { createCampaignRepository } from "../src/server/infrastructure/persistence/campaigns.ts";
import { createJobRepository } from "../src/server/infrastructure/persistence/jobs.ts";
import { createJobRunner } from "../src/server/application/jobs.ts";
import type { JobRecord } from "../src/server/application/jobs.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { createLangChainGateway } from "../src/server/adapters/models/gateway.ts";
import { createApp } from "../src/server/infrastructure/http/app.ts";
import { emptyPreferences } from "../src/shared/analysis.ts";
import { AnalysisJob, Campaign } from "../src/shared/workflows.ts";

const metadata = {
  model: "fake",
  responseId: "fictional",
  durationMs: 1,
  inputTokens: 1,
  outputTokens: 1,
};

const unknown = {
  subject: "Compétence",
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

const draft = {
  title: "Source fictive",
  purpose: "job_search" as const,
  documents: {
    profile: "Camille développe en TypeScript.",
    job: Array.from(
      { length: 9 },
      (_, index) => `Compétence ${index + 1} exigée.`,
    ).join("\n"),
    preferences: emptyPreferences,
    clarifications: "Déclaration du candidat : pratique de TypeScript.",
  },
  selection: { provider: "openai" as const, model: "fake" },
  offerSource: null,
  tracking: {
    status: "interview" as const,
    notes: "PRIVATE_HUMAN_NOTE",
    preparation: "Préparer un entretien",
    interview: "Compte rendu privé",
  },
};

async function terminal(get: () => JobRecord) {
  for (let i = 0; i < 100; i++) {
    const job = get();

    if (job.status !== "running") {
      return job;
    }

    await delay(10);
  }

  throw new Error("Test job did not settle");
}

await test("campaign creation is transactional and replayable; shared sources are copied with candidate isolation", () => {
  const db = openDatabase(":memory:");

  try {
    const dossiers = createDossierRepository(db);

    const repository = createCampaignRepository(db, dossiers);

    const source = dossiers.save(randomUUID(), draft, 0);

    const input = {
      title: "Offres",
      baseId: source.id,
      baseRevision: 1,
      members: [
        { title: "Offre A", text: "TypeScript requis." },
        { title: "Offre B", text: "Node.js requis." },
      ],
    };

    const id = randomUUID();

    const campaign = repository.create(id, input);

    assert.equal(campaign.members.length, 2);
    assert.equal(
      campaign.members[0]?.dossier.documents.profile,
      draft.documents.profile,
    );
    assert.equal(campaign.members[0]?.dossier.tracking, undefined);
    assert.deepEqual(repository.create(id, input), campaign);
    assert.equal(dossiers.list("", 0, 20).total, 3);
    assert.throws(
      () => repository.create(id, { ...input, title: "Changed" }),
      /autre campagne/,
    );
    const member = campaign.members[0]?.dossier;

    assert.ok(member);
    dossiers.save(
      source.id,
      {
        ...draft,
        documents: { ...draft.documents, profile: "Changed source" },
      },
      1,
    );
    assert.equal(
      repository.get(id).members[0]?.dossier.documents.profile,
      draft.documents.profile,
    );
    dossiers.delete(member.id, member.revision);
    assert.equal(repository.get(id).members.length, 1);
    repository.delete(id);
    assert.equal(dossiers.list("", 0, 20).total, 2);

    const recruiter = dossiers.save(
      randomUUID(),
      {
        ...draft,
        purpose: "recruiting",
        documents: {
          ...draft.documents,
          preferences: { ...emptyPreferences, workMode: "remote" },
        },
      },
      0,
    );

    const candidates = repository.create(randomUUID(), {
      ...input,
      baseId: recruiter.id,
    });

    for (const { dossier } of candidates.members) {
      assert.equal(dossier.documents.job, draft.documents.job);
      assert.deepEqual(dossier.documents.preferences, emptyPreferences);
      assert.equal(dossier.documents.clarifications, undefined);
    }

    const before = dossiers.list("", 0, 20).total;

    db.exec(
      "CREATE TRIGGER fail_second_member BEFORE INSERT ON campaign_members WHEN NEW.position=1 BEGIN SELECT RAISE(ABORT, 'test storage failure'); END;",
    );
    assert.throws(() =>
      repository.create(randomUUID(), { ...input, baseId: recruiter.id }),
    );
    assert.equal(dossiers.list("", 0, 20).total, before);
  } finally {
    db.close();
  }
});

await test("cancel and explicit resume reuse validated checkpoints, freeze sources, and save one history record", async () => {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  const repository = createJobRepository(db);

  const source = dossiers.save(randomUUID(), draft, 0);

  let calls = 0;

  let blocking = true;

  let reached: (() => void) | undefined;

  const waiting = new Promise<void>((resolve) => {
    reached = resolve;
  });

  const service = createAnalysisService(
    "fake",
    createLangChainGateway("openai", async (request, signal) => {
      calls++;
      assert.doesNotMatch(
        JSON.stringify(request.messages),
        /PRIVATE_HUMAN_NOTE|Compte rendu privé/,
      );
      if (request.name === "atomic_job_criteria") {
        return { value: identityPlan(request), metadata };
      }

      if (request.name === "job_passage_relevance") {
        return {
          metadata,
          value: {
            passages: Array.from({ length: 9 }, (_, index) => ({
              id: `J${index + 1}`,
              kind: "candidate_criterion",
            })),
          },
        };
      }

      if (calls === 4 && blocking) {
        reached?.();
        await new Promise<void>((_resolve, reject) =>
          signal?.addEventListener(
            "abort",
            () => reject(new Error("Cancelled transport")),
            { once: true },
          ),
        );
      }

      const properties = z
        .object({ properties: z.record(z.string(), z.unknown()) })
        .parse(z.toJSONSchema(request.schema)).properties;

      return {
        metadata,
        value: Object.fromEntries(
          Object.keys(properties).map((id) => [id, [unknown]]),
        ),
      };
    }),
  );

  const runner = createJobRunner(
    repository,
    dossiers,
    () => service,
    () => new Date().toISOString(),
  );

  try {
    const id = randomUUID();

    runner.start(id, source.id, source.revision);
    await waiting;
    assert.equal(repository.get(id).checkpoint?.responses.length, 3);
    assert.deepEqual(repository.get(id).progress, {
      stage: "comparison",
      completed: 1,
      total: 2,
    });
    runner.start(id, source.id, source.revision);
    assert.equal(calls, 4);
    assert.throws(
      () => runner.start(randomUUID(), source.id, source.revision),
      /déjà en cours/,
    );
    runner.cancel(id, 1);
    assert.equal((await terminal(() => runner.get(id))).status, "cancelled");
    assert.equal(dossiers.analyses(source.id, 0, 20).total, 0);
    dossiers.save(
      source.id,
      { ...draft, documents: { ...draft.documents, profile: "New profile" } },
      1,
    );
    blocking = false;
    runner.resume(id, 1);
    const done = await terminal(() => runner.get(id));

    assert.equal(done.status, "completed");
    assert.equal(calls, 5);
    assert.equal(
      done.result?.snapshot.documents.profile,
      draft.documents.profile,
    );
    assert.equal(done.result?.snapshot.tracking?.notes, "PRIVATE_HUMAN_NOTE");
    assert.equal(done.checkpoint, null);
    assert.equal(dossiers.analyses(source.id, 0, 20).total, 1);
    assert.throws(() => runner.resume(id, 1), /changé/);
    runner.start(id, source.id, 1);
    assert.equal(calls, 5);
  } finally {
    db.close();
  }
});

await test("server reopening marks unfinished work interrupted without any model call", () => {
  const directory = mkdtempSync(join(tmpdir(), "rolevidence-jobs-"));

  const path = join(directory, "store.sqlite");

  let db = openDatabase(path);

  try {
    const source = createDossierRepository(db).save(randomUUID(), draft, 0);

    const job: JobRecord = {
      id: randomUUID(),
      dossierId: source.id,
      revision: 1,
      snapshot: source,
      checkpoint: { version: "comparison-checkpoint-v1", responses: [] },
      status: "running",
      progress: { stage: "preparation", completed: 0, total: 1 },
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      attempt: 1,
      error: null,
      result: null,
    };

    createJobRepository(db).put(job);
    db.close();
    db = openDatabase(path);
    let calls = 0;

    const service = createAnalysisService("fake", async () => {
      calls++;

      return { metadata, extraction: { requirements: [] } };
    });

    const runner = createJobRunner(
      createJobRepository(db),
      createDossierRepository(db),
      () => service,
      () => new Date().toISOString(),
    );

    assert.equal(runner.get(job.id).status, "interrupted");
    assert.equal(calls, 0);
    createDossierRepository(db).delete(source.id, 1);
    assert.throws(() => runner.get(job.id), /introuvable/);
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});

await test("HTTP workflow contracts expose progress without checkpoints and preserve mutation guard/replay", async () => {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  const source = dossiers.save(randomUUID(), draft, 0);

  let calls = 0;

  const service = createAnalysisService("fake", async () => {
    calls++;

    return { metadata, extraction: { requirements: [] } };
  });

  const workflows = {
    campaigns: createCampaignRepository(db, dossiers),
    jobs: createJobRunner(
      createJobRepository(db),
      dossiers,
      () => service,
      () => new Date().toISOString(),
    ),
  };

  const server = createApp({
    workflows,
    dossiers,
    service,
    configured: true,
    model: "fake",
    readDocuments: async () => draft.documents,
  }).listen(0, "127.0.0.1");

  await once(server, "listening");
  const address = server.address();

  assert.ok(address && typeof address !== "string");
  const root = `http://127.0.0.1:${address.port}`;

  const headers = { "Content-Type": "application/json", "X-Rolevidence": "1" };

  try {
    const id = randomUUID();

    const body = JSON.stringify({ dossierId: source.id, revision: 1 });

    const url = `${root}/api/v1/analysis-jobs/${id}`;

    assert.equal(
      (
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        })
      ).status,
      403,
    );
    const accepted = await fetch(url, { method: "PUT", headers, body });

    assert.equal(accepted.status, 202);
    const payload: unknown = await accepted.json();

    AnalysisJob.parse(payload);
    assert.doesNotMatch(
      JSON.stringify(payload),
      /checkpoint|PRIVATE_HUMAN_NOTE/,
    );
    await terminal(() => workflows.jobs.get(id));
    assert.equal(
      (await fetch(url, { method: "PUT", headers, body })).status,
      200,
    );
    assert.equal(calls, 1);
    assert.equal(
      (
        await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify({ dossierId: source.id, revision: 2 }),
        })
      ).status,
      409,
    );
    const campaignId = randomUUID();

    const input = {
      title: "API campaign",
      baseId: source.id,
      baseRevision: 1,
      members: [
        { title: "A", text: "Java requis" },
        { title: "B", text: "TypeScript requis" },
      ],
    };

    const created = await fetch(`${root}/api/v1/campaigns/${campaignId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(input),
    });

    assert.equal(created.status, 201);
    assert.equal(Campaign.parse(await created.json()).members.length, 2);
    assert.equal(
      (
        await fetch(`${root}/api/v1/campaigns/${campaignId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(input),
        })
      ).status,
      201,
    );
    const publicJob = await fetch(
      `${root}/api/v1/dossiers/${source.id}/latest-job`,
    );

    assert.equal(AnalysisJob.parse(await publicJob.json()).status, "completed");
  } finally {
    server.closeAllConnections();
    server.close();
    db.close();
  }
});

await test("storage failure after paid stages resumes from checkpoints without repeating model work", async () => {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  const source = dossiers.save(
    randomUUID(),
    { ...draft, documents: { ...draft.documents, job: "TypeScript requis." } },
    0,
  );

  const repository = createJobRepository(db);

  let calls = 0;

  const service = createAnalysisService(
    "fake",
    createLangChainGateway("openai", async (request) => {
      calls++;

      return {
        metadata,
        value:
          request.name === "job_passage_relevance"
            ? { passages: [{ id: "J1", kind: "candidate_criterion" }] }
            : { J1: [unknown] },
      };
    }),
  );

  let failing = true;

  const runner = createJobRunner(
    repository,
    {
      ...dossiers,
      append: (...args) => {
        const saved = dossiers.append(...args);

        if (failing) {
          throw new Error("Simulated lost storage acknowledgement");
        }

        return saved;
      },
    },
    () => service,
    () => new Date().toISOString(),
  );

  try {
    const id = randomUUID();

    runner.start(id, source.id, 1);
    assert.equal((await terminal(() => runner.get(id))).status, "failed");
    assert.equal(calls, 2);
    assert.equal(dossiers.analyses(source.id, 0, 20).total, 1);
    failing = false;
    runner.resume(id, 1);
    assert.equal((await terminal(() => runner.get(id))).status, "completed");
    assert.equal(calls, 2);
    assert.equal(dossiers.analyses(source.id, 0, 20).total, 1);
  } finally {
    db.close();
  }
});

await test("unknown checkpoint versions fail before a paid invocation", async () => {
  let calls = 0;

  const service = createAnalysisService(
    "fake",
    createLangChainGateway("openai", async () => {
      calls++;
      throw new Error("must not call");
    }),
  );

  await assert.rejects(
    service.analyze(draft.documents, undefined, {
      checkpoint: { version: "unknown-new-version", responses: [] },
      onProgress: () => {},
      onCheckpoint: () => {},
    }),
    /nouvelle demande/,
  );
  assert.equal(calls, 0);
});

await test("v0.3 SQLite migration retains dossiers and history and supports new workflows", () => {
  const directory = mkdtempSync(join(tmpdir(), "rolevidence-migration-"));

  const path = join(directory, "store.sqlite");

  let db = openDatabase(path);

  try {
    const dossiers = createDossierRepository(db);

    const source = dossiers.save(randomUUID(), draft, 0);

    dossiers.append(
      source,
      {
        analysis: { matches: [], gaps: [], unknowns: [], needsReview: [] },
        metadata,
      },
      "old-analysis",
    );
    db.exec(
      "DROP TABLE campaign_members; DROP TABLE campaigns; DROP TABLE analysis_jobs; PRAGMA user_version=1;",
    );
    db.close();
    db = openDatabase(path);
    const upgraded = createDossierRepository(db);

    assert.deepEqual(upgraded.get(source.id), source);
    assert.equal(upgraded.analyses(source.id, 0, 10).total, 1);
    assert.equal(db.prepare("PRAGMA user_version").get()?.user_version, 3);
    const campaign = createCampaignRepository(db, upgraded).create(
      randomUUID(),
      {
        title: "After migration",
        baseId: source.id,
        baseRevision: 1,
        members: [
          { title: "A", text: "TypeScript requis." },
          { title: "B", text: "Java requis." },
        ],
      },
    );

    assert.equal(campaign.members.length, 2);
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});

await test("graceful shutdown aborts active transport and persists interruption before closing storage", async () => {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  const source = dossiers.save(randomUUID(), draft, 0);

  const service = createAnalysisService("fake", async (_request, signal) => {
    await new Promise<void>((_resolve, reject) =>
      signal?.addEventListener("abort", () => reject(new Error("abort")), {
        once: true,
      }),
    );
    throw new Error("unreachable");
  });

  const runner = createJobRunner(
    createJobRepository(db),
    dossiers,
    () => service,
    () => new Date().toISOString(),
  );

  try {
    const id = randomUUID();

    runner.start(id, source.id, 1);
    await runner.shutdown();
    assert.equal(runner.get(id).status, "interrupted");
    assert.equal(runner.isBusy(), false);
    assert.equal(dossiers.analyses(source.id, 0, 10).total, 0);
  } finally {
    db.close();
  }
});
