import { zodTextFormat } from "openai/helpers/zod";
import type { DocumentsInput } from "../../domain/models.ts";
import { createExtractionSchema } from "./extraction.ts";
import { createSourceCatalog } from "./sources.ts";
import { createMessages } from "./messages.ts";

export const MODEL_TIMEOUT_MS = 60_000;

export const MAX_OUTPUT_TOKENS = 4500;

export const PROMPT_VERSION = "evidence-v3.7-source-boundary";

export const SCHEMA_VERSION = "analysis-v1.1";

export function createAnalysisRequest(
  documents: DocumentsInput,
  model: string,
) {
  return {
    model,
    input: createMessages(documents),
    text: {
      format: zodTextFormat(
        createExtractionSchema(createSourceCatalog(documents)),
        "requirements_evidence",
      ),
    },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
  };
}
