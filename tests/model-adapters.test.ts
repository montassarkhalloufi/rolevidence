import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createStructuredModel } from "../src/server/infrastructure/model-client.ts";

const base = {
  schema: z.object({ answer: z.string() }).strict(),
  name: "test_answer",
  promptVersion: "test-v1",
  messages: [{ role: "user" as const, content: "Fictional test" }],
};

const openai = (text: string, status = "completed") => ({
  id: "resp_mock",
  object: "response",
  created_at: 1,
  status,
  model: "gpt-4.1-mini-2025-04-14",
  output: [
    {
      type: "message",
      id: "msg_mock",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text, annotations: [] }],
    },
  ],
  usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
  error: null,
  incomplete_details: null,
});

const anthropic = (text: string, stop = "end_turn") => ({
  id: "msg_mock",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-4-6",
  content: [{ type: "text", text }],
  stop_reason: stop,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
});

for (const provider of ["openai", "anthropic"] as const) {
  await test(`${provider}: actual LangChain serialization, schema parsing, token accounting and no tool access`, async () => {
    let captured: Record<string, unknown> = {};

    let url = "";

    const transport: typeof fetch = async (input, init) => {
      url = String(input);
      captured = JSON.parse(String(init?.body)) as Record<string, unknown>;

      return Response.json(
        provider === "openai"
          ? openai('{"answer":"ok"}')
          : anthropic('{"answer":"ok"}'),
      );
    };

    const invoke = createStructuredModel(
      { openai: "fake", anthropic: "fake" },
      transport,
    );

    const result = await invoke({
      ...base,
      selection: {
        provider,
        model: provider === "openai" ? "gpt-4.1-mini" : "claude-sonnet-4-6",
      },
    });

    assert.deepEqual(result.value, { answer: "ok" });
    assert.equal(result.metadata.provider, provider);
    assert.equal(result.metadata.inputTokens, 10);
    assert.equal(result.metadata.outputTokens, 5);
    assert.ok(!captured.tools || JSON.stringify(captured.tools) === "[]");
    if (provider === "openai") {
      assert.match(url, /responses/);
      assert.equal(captured.store, false);
    } else {
      assert.match(url, /messages/);
    }
  });
  await test(`${provider}: invalid output and HTTP failure are safe, without retry`, async () => {
    let calls = 0;

    const transport: typeof fetch = async () => {
      calls++;

      return Response.json({ error: { message: "PRIVATE" } }, { status: 500 });
    };

    const invoke = createStructuredModel(
      { openai: "fake", anthropic: "fake" },
      transport,
    );

    await assert.rejects(
      invoke({ ...base, selection: { provider, model: "fake" } }),
      { code: "PROVIDER_ERROR" },
    );
    assert.equal(calls, 1);
    const invalid = createStructuredModel(
      { openai: "fake", anthropic: "fake" },
      async () =>
        Response.json(
          provider === "openai"
            ? openai('{"wrong":true}')
            : anthropic('{"wrong":true}'),
        ),
    );

    await assert.rejects(
      invalid({ ...base, selection: { provider, model: "fake" } }),
      { code: "INVALID_OUTPUT" },
    );
  });
}

await test("missing provider key rejects before transport", async () => {
  const invoke = createStructuredModel(
    { openai: undefined, anthropic: undefined },
    async () => {
      throw new Error("must not call");
    },
  );

  await assert.rejects(
    invoke({ ...base, selection: { provider: "anthropic", model: "fake" } }),
    { code: "NOT_CONFIGURED" },
  );
});

await test("provider completion limits are rejected even when the partial JSON parses", async () => {
  for (const provider of ["openai", "anthropic"] as const) {
    const invoke = createStructuredModel(
      { openai: "fake", anthropic: "fake" },
      async () =>
        Response.json(
          provider === "openai"
            ? openai('{"answer":"ok"}', "incomplete")
            : anthropic('{"answer":"ok"}', "max_tokens"),
        ),
    );

    await assert.rejects(
      invoke({ ...base, selection: { provider, model: "fake" } }),
      { code: "INCOMPLETE" },
    );
  }
});

await test("the full evidence schema closes nested nullable objects for OpenAI strict output", async () => {
  const { createExtractionSchema } =
    await import("../src/server/adapters/models/extraction.ts");

  const { createSourceCatalog } =
    await import("../src/server/adapters/models/sources.ts");

  const schema = createExtractionSchema(
    createSourceCatalog({
      profile: "Camille utilise TypeScript.",
      job: "TypeScript requis.",
    }),
  );

  const invoke = createStructuredModel(
    { openai: "fake", anthropic: undefined },
    async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        text: { format: { schema: unknown } };
      };

      function check(value: unknown) {
        if (!value || typeof value !== "object") {
          return;
        }

        const object = value as Record<string, unknown>;

        if (object.type === "object") {
          assert.equal(object.additionalProperties, false);
        }

        for (const item of Object.values(object)) {
          check(item);
        }
      }

      check(body.text.format.schema);

      return Response.json(openai('{"requirements":[]}'));
    },
  );

  await invoke({
    ...base,
    schema,
    selection: { provider: "openai", model: "fake" },
  });
});

await test("explicit provider refusals are reported without validating a fabricated answer", async () => {
  const refusal = {
    ...openai(""),
    output: [
      {
        type: "message",
        id: "msg_mock",
        role: "assistant",
        status: "completed",
        content: [{ type: "refusal", refusal: "Cannot comply" }],
      },
    ],
  };

  const invoke = createStructuredModel(
    { openai: "fake", anthropic: undefined },
    async () => Response.json(refusal),
  );

  await assert.rejects(
    invoke({ ...base, selection: { provider: "openai", model: "fake" } }),
    { code: "REFUSAL" },
  );
});

for (const provider of ["openai", "anthropic"] as const) {
  await test(`${provider}: Unicode survives transport; corrupted text rejects without retry`, async () => {
    const answer =
      "Développement React/TypeScript ; contribution à l’optimisation.\nDiplôme d’ingénieur.";

    let calls = 0;

    let payload = answer;

    const invoke = createStructuredModel(
      { openai: "fake", anthropic: "fake" },
      async () => {
        calls++;
        const text = JSON.stringify({ answer: payload });

        return Response.json(
          provider === "openai" ? openai(text) : anthropic(text),
        );
      },
    );

    const request = { ...base, selection: { provider, model: "fake" } };

    assert.deepEqual((await invoke(request)).value, { answer });
    for (const corrupted of ["l\u0002optimisation", "D\ufffdveloppement"]) {
      payload = corrupted;
      await assert.rejects(invoke(request), { code: "INVALID_OUTPUT" });
    }

    assert.equal(calls, 3);
  });
}
