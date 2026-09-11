import {
  createAnalysisRequest,
  PROMPT_VERSION,
  SCHEMA_VERSION,
} from "./request.ts";
import { createExtractionSchema } from "./extraction.ts";
import { createSourceCatalog } from "./sources.ts";
import type { SourceCatalog } from "./sources.ts";
import { mapExtraction } from "./map-extraction.ts";
import { AppError } from "../../application/errors.ts";
import type { ModelGateway } from "../../application/analyze.ts";
import type { ResponseTransport, ProviderResponse } from "./transport.ts";

function parseExtraction(response: ProviderResponse, catalog: SourceCatalog) {
  if (response.status !== "completed") {
    throw new AppError(
      "INCOMPLETE",
      "La réponse du modèle est incomplète. Aucune analyse validée.",
    );
  }

  if (
    response.output.some(
      (item) =>
        item.type === "message" &&
        item.content?.some((content) => content.type === "refusal"),
    )
  ) {
    throw new AppError("REFUSAL", "Le modèle a refusé la demande.");
  }

  try {
    return createExtractionSchema(catalog).parse(
      JSON.parse(response.output_text) as unknown,
    );
  } catch {
    throw new AppError(
      "INVALID_OUTPUT",
      "La réponse ne respecte pas le contrat de données.",
    );
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
