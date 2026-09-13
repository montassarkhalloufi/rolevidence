import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import type { StructuredRequest } from "../../adapters/models/structured.ts";
import { MAX_OUTPUT_TOKENS } from "../../adapters/models/settings.ts";

export function createAnthropicModel(
  request: StructuredRequest,
  apiKey: string,
  transport: typeof fetch,
) {
  return new ChatAnthropic({
    apiKey,
    model: request.selection.model,
    maxRetries: 0,
    maxTokens: MAX_OUTPUT_TOKENS,
    clientOptions: { fetch: transport },
  }).withStructuredOutput(z.toJSONSchema(request.schema), {
    name: request.name,
    method: "jsonSchema",
    includeRaw: true,
  });
}
