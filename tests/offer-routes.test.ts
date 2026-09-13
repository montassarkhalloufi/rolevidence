import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { registerOfferRoutes } from "../src/server/infrastructure/offers/routes.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { createProviderRegistry } from "../src/server/application/provider-registry.ts";
import { createJobExtractor } from "../src/server/adapters/models/job-extraction.ts";
import { errorHandler } from "../src/server/infrastructure/http/errors.ts";
import {
  requestMetadata,
  localHostGuard,
  localRequestGuard,
} from "../src/server/infrastructure/http/middleware.ts";
import { AppError } from "../src/server/application/errors.ts";
import {
  LOCAL_CLIENT_HEADER,
  LOCAL_CLIENT_VALUE,
} from "../src/shared/api-config.ts";

await test("offer imports validate before fetching and retain replay/conflict/failure identity", async (t) => {
  let pageCalls = 0;

  let modelCalls = 0;

  const selection = { provider: "anthropic" as const, model: "fake" };

  const service = createAnalysisService("fake", async () => {
    throw new Error("analysis must not execute during offer import");
  });

  const registry = createProviderRegistry([
    { option: { ...selection, configured: true }, service },
    {
      option: { provider: "openai", model: "fake", configured: false },
      service,
    },
  ]);

  const extract = createJobExtractor(async () => {
    modelCalls++;

    return {
      value: {
        fields: [
          { name: "skills", value: "TypeScript", quote: "TypeScript requis." },
          { name: "salary", value: "65000 EUR", quote: "invented" },
        ],
      },
      metadata: {
        model: "fake",
        responseId: "fake",
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  });

  const app = express();

  app.use(
    requestMetadata(() => {}),
    localHostGuard,
    localRequestGuard,
    express.json(),
  );
  registerOfferRoutes(app, registry, extract, async (url) => {
    pageCalls++;
    if (url.endsWith("/failed")) {
      throw new AppError("IMPORT_FAILED", "Fictional failure");
    }

    return {
      url,
      html: "<main><h1>Experienced backend developer</h1><p>TypeScript requis.</p></main>",
    };
  });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");

  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();

  assert.ok(address && typeof address !== "string");
  const input = { url: "https://example.com/job", selection };

  const post = (
    body: unknown,
    key = "offer-import-test-0001",
    guarded = true,
  ) =>
    fetch(`http://127.0.0.1:${address.port}/api/v1/offer-imports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        [LOCAL_CLIENT_HEADER]: guarded ? LOCAL_CLIENT_VALUE : "",
      },
      body: JSON.stringify(body),
    });

  assert.equal((await post(input, "short")).status, 400);
  assert.equal((await post(input, undefined, false)).status, 403);
  assert.equal((await post({ ...input, extra: true })).status, 400);
  assert.equal(
    (await post({ ...input, selection: { provider: "openai", model: "fake" } }))
      .status,
    503,
  );
  assert.equal(pageCalls, 0);
  const first = await post(input);

  assert.equal(first.status, 200);
  const result = await first.json();

  assert.equal(result.rejectedFields, 1);
  assert.equal(result.source.fields.length, 1);
  assert.equal(result.source.url, input.url);
  assert.ok(result.source.text.includes("TypeScript requis."));
  const replay = await post(input);

  assert.equal(replay.headers.get("Idempotency-Replayed"), "true");
  assert.deepEqual(await replay.json(), result);
  assert.equal(
    (await post({ ...input, url: "https://example.com/other" })).status,
    409,
  );
  assert.equal(pageCalls, 1);
  assert.equal(modelCalls, 1);
  const failed = { ...input, url: "https://example.com/failed" };

  assert.equal((await post(failed, "failed-import-test-01")).status, 422);
  assert.equal((await post(failed, "failed-import-test-01")).status, 422);
  assert.equal(pageCalls, 2);
  assert.equal(modelCalls, 1);
});
