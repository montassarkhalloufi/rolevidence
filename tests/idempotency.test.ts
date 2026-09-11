import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createIdempotentAnalysis } from "../src/server/application/idempotency.ts";
import { createMemoryAnalysisStore } from "../src/server/infrastructure/analysis-store.ts";
import type { AnalysisOutput } from "../src/server/application/analyze.ts";

const output: AnalysisOutput = {
  analysis: { matches: [], gaps: [], unknowns: [], needsReview: [] },
  metadata: {
    responseId: "fake",
    model: "fake",
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
  },
};

await test("Concurrent duplicates share one execution; changed payload and other active requests are rejected", async () => {
  const run = createIdempotentAnalysis(createMemoryAnalysisStore());

  const deferred = Promise.withResolvers<AnalysisOutput>();

  let calls = 0;

  const execute = () => {
    calls++;

    return deferred.promise;
  };

  const first = run("key", "fingerprint", execute);

  const duplicate = run("key", "fingerprint", execute);

  assert.equal(duplicate.replayed, true);
  assert.equal(first.result, duplicate.result);
  assert.throws(() => run("key", "different", execute), {
    code: "IDEMPOTENCY_CONFLICT",
  });
  assert.throws(() => run("other", "fingerprint", execute), { code: "BUSY" });
  deferred.resolve(output);
  assert.deepEqual(await first.result, output);
  assert.equal(calls, 1);
  assert.deepEqual(await run("key", "fingerprint", execute).result, output);
  assert.equal(calls, 1);
});
await test("Uncertain failures are replayed without a second provider execution", async () => {
  const run = createIdempotentAnalysis(createMemoryAnalysisStore());

  let calls = 0;

  const execute = async () => {
    calls++;
    throw new Error("uncertain");
  };

  await assert.rejects(run("key", "same", execute).result, /uncertain/);
  await assert.rejects(run("key", "same", execute).result, /uncertain/);
  assert.equal(calls, 1);
});
await test("Capacity rejection never invokes the provider; settled entries expire", async () => {
  const store = createMemoryAnalysisStore(20, 1);

  const run = createIdempotentAnalysis(store);

  await run("first", "same", async () => output).result;
  let calls = 0;

  const execute = async () => {
    calls++;

    return output;
  };

  assert.throws(() => run("second", "same", execute), { code: "CAPACITY" });
  await delay(40);
  assert.equal(calls, 0);
  assert.equal(store.get("first"), undefined);
  await run("second", "same", execute).result;
  assert.equal(calls, 1);
});
