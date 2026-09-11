import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/server/infrastructure/http/app.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";

const documents = { profile: "TypeScript", job: "TypeScript" };

await test("HTTP v1 replay/conflict/problem contract and correlation IDs (fake gateway)", async (t) => {
  let calls = 0;

  const service = createAnalysisService("fake", async () => {
    calls++;

    return {
      extraction: { requirements: [] },
      metadata: {
        responseId: "fake",
        model: "fake",
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  });

  const server = createApp({
    service,
    readDocuments: async () => documents,
    model: "fake",
    configured: true,
  }).listen(0, "127.0.0.1");

  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();

  assert(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/v1/analyses`;

  const headers = {
    "Content-Type": "application/json",
    "X-Rolevidence": "1",
    "Idempotency-Key": crypto.randomUUID(),
  };

  const post = (
    body: unknown = documents,
    requestHeaders: Record<string, string> = headers,
  ) =>
    fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

  const first = await post();

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("idempotency-replayed"), "false");
  const body = await first.json();

  const second = await post();

  assert.equal(second.headers.get("idempotency-replayed"), "true");
  assert.deepEqual(await second.json(), body);
  assert.notEqual(
    first.headers.get("x-request-id"),
    second.headers.get("x-request-id"),
  );
  const conflict = await post({ ...documents, profile: "JavaScript" });

  assert.equal(conflict.status, 409);
  assert.match(
    conflict.headers.get("content-type") ?? "",
    /application\/problem\+json/,
  );
  const problem = await conflict.json();

  assert.equal(problem.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(problem.requestId, conflict.headers.get("x-request-id"));
  assert.equal(conflict.headers.get("cache-control"), "no-store");
  const missingKey = await post(documents, {
    ...headers,
    "Idempotency-Key": "",
  });

  assert.equal(missingKey.status, 400);
  assert.equal(calls, 1);
});
