import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/server/infrastructure/http/app.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { createProviderRegistry } from "../src/server/application/provider-registry.ts";
import { openDatabase } from "../src/server/infrastructure/persistence/database.ts";
import { createDossierRepository } from "../src/server/infrastructure/persistence/dossiers.ts";
import { emptyPreferences } from "../src/shared/analysis.ts";

await test("HTTP dossiers, optimistic saves, provider selection and storage recovery without another paid call", async (t) => {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  let calls = 0;

  const service = createAnalysisService("fake", async () => {
    calls++;

    return {
      extraction: { requirements: [] },
      metadata: {
        provider: "openai",
        model: "fake",
        responseId: "fake",
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  });

  const providers = createProviderRegistry([
    {
      option: { provider: "openai", model: "fake", configured: true },
      service,
    },
    {
      option: { provider: "anthropic", model: "fake", configured: false },
      service,
    },
  ]);

  const documents = {
    profile: "Camille utilise TypeScript.",
    job: "TypeScript requis.",
    preferences: emptyPreferences,
  };

  const server = createApp({
    service,
    providers,
    dossiers,
    model: "fake",
    configured: true,
    readDocuments: async () => documents,
  }).listen(0, "127.0.0.1");

  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
    db.close();
  });
  const address = server.address();

  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  const headers = { "Content-Type": "application/json", "X-Rolevidence": "1" };

  const send = (path: string, method: string, body: unknown, extra = {}) =>
    fetch(base + path, {
      method,
      headers: { ...headers, ...extra },
      body: JSON.stringify(body),
    });

  const id = crypto.randomUUID();

  const draft = {
    title: "Camille",
    purpose: "recruiting",
    documents,
    selection: { provider: "openai", model: "fake" },
    offerSource: null,
  };

  const saved = await send(`/dossiers/${id}`, "PUT", { draft, revision: 0 });

  assert.equal(saved.status, 201);
  assert.equal(
    (await send(`/dossiers/${id}`, "PUT", { draft, revision: 0 })).status,
    409,
  );
  assert.equal(
    (
      await fetch(base + `/dossiers/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: '{"revision":1}',
      })
    ).status,
    403,
  );
  const input = {
    ...documents,
    selection: draft.selection,
    dossierId: id,
    dossierRevision: 1,
  };

  assert.equal(
    (
      await send(
        "/analyses",
        "POST",
        { ...input, selection: { provider: "anthropic", model: "fake" } },
        { "Idempotency-Key": crypto.randomUUID() },
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await send("/analysis-context", "POST", {
        ...documents,
        selection: { provider: "anthropic", model: "fake" },
      })
    ).status,
    200,
  );
  assert.equal(calls, 0);
  const key = { "Idempotency-Key": crypto.randomUUID() };

  db.exec("PRAGMA query_only=ON");
  assert.equal((await send("/analyses", "POST", input, key)).status, 507);
  assert.equal(calls, 1);
  db.exec("PRAGMA query_only=OFF");
  const recovered = await send("/analyses", "POST", input, key);

  assert.equal(recovered.status, 200);
  assert.equal(recovered.headers.get("Idempotency-Replayed"), "true");
  assert.equal(calls, 1);
  assert.equal(dossiers.analyses(id, 0, 10).total, 1);
  assert.equal(
    (await send("/analyses", "POST", { ...input, profile: "Changed" }, key))
      .status,
    409,
  );
  const replay = await send("/analyses", "POST", input, key);

  assert.equal(replay.status, 200);
  assert.equal(dossiers.analyses(id, 0, 10).total, 1);
  assert.equal(
    (await send(`/dossiers/${id}`, "DELETE", { revision: 1 })).status,
    200,
  );
  assert.equal((await fetch(base + `/dossiers/${id}`)).status, 404);
});
