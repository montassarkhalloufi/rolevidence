import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/server/infrastructure/persistence/database.ts";
import { createCaseFileRepository } from "../src/server/infrastructure/persistence/case-files.ts";
import { emptyPreferences } from "../src/shared/analysis.ts";

const draft = {
  title: "Camille — Backend",
  purpose: "job_search" as const,
  documents: {
    profile: "Camille utilise TypeScript.",
    job: "TypeScript requis.",
    preferences: emptyPreferences,
  },
  selection: { provider: "openai" as const, model: "fake" },
  offerSource: null,
};

const output = {
  analysis: { matches: [], gaps: [], unknowns: [], needsReview: [] },
  metadata: {
    model: "fake",
    responseId: "fake",
    durationMs: 1,
    inputTokens: 10,
    outputTokens: 5,
  },
};

await test("dossiers survive reopen; immutable snapshots and cascade deletion are isolated", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rolevidence-test-"));

  const path = join(directory, "test.sqlite");

  let db = openDatabase(path);

  try {
    let repo = createCaseFileRepository(db);

    const first = repo.save(crypto.randomUUID(), draft, 0);

    const second = repo.save(
      crypto.randomUUID(),
      { ...draft, title: "Autre dossier" },
      0,
    );

    const analysis = repo.append(first, output, "request-one");

    assert.equal(repo.append(first, output, "request-one").id, analysis.id);
    const modified = repo.save(
      first.id,
      {
        ...draft,
        documents: { ...draft.documents, profile: "Nouveau profil" },
      },
      1,
    );

    assert.equal(modified.revision, 2);
    assert.throws(() => repo.save(first.id, draft, 1), {
      code: "IDEMPOTENCY_CONFLICT",
    });
    assert.equal(
      repo.analyses(first.id, 0, 10).items[0]?.snapshot.documents.profile,
      draft.documents.profile,
    );
    db.close();
    db = openDatabase(path);
    repo = createCaseFileRepository(db);
    assert.equal(repo.get(first.id).documents.profile, "Nouveau profil");
    assert.deepEqual(repo.analyses(first.id, 0, 10).items[0], analysis);
    assert.equal(repo.list("Autre", 0, 20).total, 1);
    assert.equal(repo.list("%", 0, 20).total, 0);
    assert.throws(() => repo.delete(first.id, 1), {
      code: "IDEMPOTENCY_CONFLICT",
    });
    repo.delete(first.id, 2);
    assert.throws(() => repo.get(first.id), { code: "NOT_FOUND" });
    assert.equal(
      db.prepare("SELECT count(*) AS count FROM analyses").get()?.count,
      0,
    );
    assert.deepEqual(repo.get(second.id), second);
  } finally {
    db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

await test("failed local writes do not report success or replace existing content", () => {
  const db = openDatabase(":memory:");

  const repo = createCaseFileRepository(db);

  const saved = repo.save(crypto.randomUUID(), draft, 0);

  db.exec("PRAGMA query_only=ON");
  assert.throws(() => repo.save(saved.id, { ...draft, title: "Lost" }, 1), {
    code: "STORAGE_ERROR",
  });
  assert.equal(repo.get(saved.id).title, draft.title);
  db.close();
});
