import test from "node:test";
import assert from "node:assert/strict";
import { createLangSmithSink } from "../src/server/infrastructure/telemetry.ts";

const event = {
  provider: "anthropic",
  model: "fictional-model",
  promptVersion: "test-v1",
  durationMs: 25,
  inputTokens: 10,
  outputTokens: 5,
  errorCode: null,
};

await test("LangSmith serializes content-free events and uses the configured endpoint", async (t) => {
  const originalEndpoint = process.env.LANGSMITH_ENDPOINT;

  process.env.LANGSMITH_ENDPOINT = "https://eu.api.smith.langchain.com";
  t.after(() => {
    if (originalEndpoint === undefined) {
      delete process.env.LANGSMITH_ENDPOINT;
    } else {
      process.env.LANGSMITH_ENDPOINT = originalEndpoint;
    }
  });
  const payloads: Record<string, unknown>[] = [];

  const sink = createLangSmithSink(
    "fictional-key",
    "fictional-project",
    async (input, init) => {
      assert.equal(String(input), "https://eu.api.smith.langchain.com/runs");
      payloads.push(JSON.parse(String(init?.body)) as Record<string, unknown>);

      return Response.json({});
    },
  );

  await sink(event);
  await sink({ ...event, errorCode: "PROVIDER_ERROR" });
  assert.equal(payloads.length, 2);
  for (const payload of payloads) {
    assert.deepEqual(payload.inputs, {});
    assert.deepEqual(payload.outputs, {});
    assert.equal(payload.session_name, "fictional-project");
    assert.equal(payload.name, "rolevidence.structured-model");
    assert.doesNotMatch(
      JSON.stringify(payload),
      /fictional-key|messages|responseId/,
    );
  }

  assert.equal(payloads[1]?.error, "PROVIDER_ERROR");
});

await test("LangSmith bounds pending events and frees capacity after failed writes without retries", async () => {
  const gate = Promise.withResolvers<void>();

  let calls = 0;

  const sink = createLangSmithSink(
    "fictional-key",
    "fictional-project",
    async () => {
      calls++;
      await gate.promise;

      return Response.json({ error: "unavailable" }, { status: 503 });
    },
  );

  const pending = Array.from({ length: 10 }, () => sink(event));

  const settled = Promise.allSettled(pending);

  await new Promise((resolve) => setImmediate(resolve));
  await sink(event);
  assert.equal(calls, 10);
  gate.resolve();
  assert.ok((await settled).every((result) => result.status === "rejected"));
  const next = sink(event);

  const rejected = assert.rejects(next);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 11);

  await rejected;
});

await test("telemetry failures are bounded by a deadline and never expose remote bodies", async () => {
  const sink = createLangSmithSink(
    "fictional-key",
    "fictional-project",
    async (_input, init) => {
      assert.equal(init?.redirect, "error");
      const signal = init?.signal;

      assert.ok(signal);

      return await new Promise<Response>((_resolve, reject) => {
        const keepAlive = setTimeout(
          () => reject(new Error("deadline missing")),
          3000,
        );

        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(keepAlive);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
  );

  await assert.rejects(sink(event), { name: "TimeoutError" });
  let calls = 0;

  const rejected = createLangSmithSink(
    "fictional-key",
    "fictional-project",
    async () => {
      calls++;

      return Response.json({ detail: "PRIVATE remote body" }, { status: 429 });
    },
  );

  await assert.rejects(rejected(event), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /PRIVATE/);

    return true;
  });
  assert.equal(calls, 1);
});
