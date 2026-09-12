import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAIGateway } from "../src/server/adapters/openai/gateway.ts";
import type { ProviderResponse } from "../src/server/adapters/openai/transport.ts";

const request = {
  model: "fake",
  documents: { profile: "TypeScript", job: "TypeScript" },
};

const response: ProviderResponse = {
  id: "fake",
  model: "fake",
  status: "completed",
  output: [],
  output_text: '{"requirements":[]}',
};

await test("Provider adapter sends bounded structured request and includes prompt/schema versions (fake transport)", async () => {
  const gateway = createOpenAIGateway(async (input) => {
    assert.equal(input.store, false);
    assert.equal(input.max_output_tokens, 9000);
    assert.equal(input.text.format.type, "json_schema");

    return response;
  });

  const result = await gateway(request);

  assert.deepEqual(result.extraction, {
    requirements: [],
    unassessedJobQuotes: ["TypeScript"],
  });
  assert.ok(result.metadata.promptVersion);
  assert.ok(result.metadata.schemaVersion);
});
for (const [name, value, code] of [
  ["incomplete", { ...response, status: "incomplete" }, "INCOMPLETE"],
  [
    "refusal",
    {
      ...response,
      output: [{ type: "message", content: [{ type: "refusal" }] }],
    },
    "REFUSAL",
  ],
  [
    "invalid JSON",
    { ...response, output_text: "SECRET_RAW_PROVIDER_TEXT" },
    "INVALID_OUTPUT",
  ],
  [
    "invalid schema",
    { ...response, output_text: '{"score":100}' },
    "INVALID_OUTPUT",
  ],
] as const) {
  await test(`Provider ${name} is a safe typed failure`, async () => {
    await assert.rejects(
      createOpenAIGateway(async () => value)(request),
      (error) => {
        assert.equal((error as { code: string }).code, code);
        assert.equal(String(error).includes("SECRET_RAW_PROVIDER_TEXT"), false);

        return true;
      },
    );
  });
}
