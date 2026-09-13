import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { StructuredRequest } from "../../adapters/models/structured.ts";
import {
  MODEL_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
} from "../../adapters/models/settings.ts";

export function createOpenAIModel(
  request: StructuredRequest,
  apiKey: string,
  transport: typeof fetch,
) {
  return new ChatOpenAI({
    apiKey,
    model: request.selection.model,
    useResponsesApi: true,
    modelKwargs: { store: false },
    configuration: { fetch: transport },
    maxRetries: 0,
    timeout: MODEL_TIMEOUT_MS,
    maxTokens: MAX_OUTPUT_TOKENS,
  }).withStructuredOutput(z.toJSONSchema(request.schema), {
    name: request.name,
    method: "jsonSchema",
    strict: true,
    includeRaw: true,
  });
}
