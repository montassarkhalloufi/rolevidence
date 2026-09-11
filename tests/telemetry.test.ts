import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { observeModel } from "../src/server/infrastructure/telemetry.ts";
import type { TechnicalEvent } from "../src/server/infrastructure/telemetry.ts";
import { AppError } from "../src/server/application/errors.ts";

const request = {
  selection: { provider: "openai" as const, model: "fake" },
  schema: z.object({ secret: z.string() }),
  name: "test",
  promptVersion: "test-v1",
  messages: [
    { role: "user" as const, content: "PRIVATE CV email@example.com" },
  ],
};

await test("telemetry has no input, output or provider identifiers, and sink failure cannot fail analysis", async () => {
  const events: TechnicalEvent[] = [];

  const invoke = observeModel(
    async () => ({
      value: { secret: "PRIVATE OUTPUT" },
      metadata: {
        responseId: "PRIVATE ID",
        model: "fake",
        durationMs: 0,
        inputTokens: 10,
        outputTokens: 5,
      },
    }),
    async (event) => {
      events.push(event);
      throw new Error("sink offline");
    },
  );

  assert.deepEqual((await invoke(request)).value, { secret: "PRIVATE OUTPUT" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(events.length, 1);
  assert.doesNotMatch(
    JSON.stringify(events),
    /PRIVATE|email|messages|responseId/,
  );
  assert.equal(events[0]?.inputTokens, 10);
});
await test("provider failures remain failures and telemetry records only safe error code", async () => {
  const events: TechnicalEvent[] = [];

  const invoke = observeModel(
    async () => {
      throw new AppError("REFUSAL", "PRIVATE raw error");
    },
    async (event) => {
      events.push(event);
    },
  );

  await assert.rejects(invoke(request), { code: "REFUSAL" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(events[0]?.errorCode, "REFUSAL");
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE/);
});
