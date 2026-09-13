import { zodTextFormat } from "openai/helpers/zod";
import type { DocumentsInput } from "../../domain/models.ts";
import { createExtractionSchema } from "../models/extraction.ts";
import { createSourceCatalog } from "../models/sources.ts";
import { createMessages } from "../models/messages.ts";
import { MAX_OUTPUT_TOKENS } from "../models/settings.ts";

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
