import { errorMessages } from "../../application/locales/errors-fr.ts";
import { createAnalysisRequest } from "./request.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "../models/settings.ts";
import { createExtractionSchema } from "../models/extraction.ts";
import { createSourceCatalog } from "../models/sources.ts";
import type { SourceCatalog } from "../models/sources.ts";
import { mapExtraction } from "../models/map-extraction.ts";
import { AppError } from "../../application/errors.ts";
import type { ModelGateway } from "../../application/analyze.ts";
import type { ResponseTransport, ProviderResponse } from "./transport.ts";

function parseExtraction(response: ProviderResponse, catalog: SourceCatalog) {
  if (response.status !== "completed") {
    throw new AppError("INCOMPLETE", errorMessages.incompleteExtraction);
  }

  if (
    response.output.some(
      (item) =>
        item.type === "message" &&
        item.content?.some((content) => content.type === "refusal"),
    )
  ) {
    throw new AppError("REFUSAL", errorMessages.extractionRefused);
  }

  try {
    return createExtractionSchema(catalog).parse(
      JSON.parse(response.output_text) as unknown,
    );
  } catch {
    throw new AppError("INVALID_OUTPUT", errorMessages.invalidExtraction);
  }
}

export function createOpenAIGateway(
  transport: ResponseTransport,
): ModelGateway {
  return async ({ documents, model }, signal) => {
    const started = performance.now();

    const catalog = createSourceCatalog(documents);

    const response = await transport(
      createAnalysisRequest(documents, model),
      signal,
    );

    return {
      extraction: mapExtraction(parseExtraction(response, catalog), catalog),
      metadata: {
        responseId: response.id,
        model: response.model,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        durationMs: Math.round(performance.now() - started),
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
      },
    };
  };
}
