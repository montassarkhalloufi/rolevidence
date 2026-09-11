import type { ModelGateway } from "../../application/analyze.ts";
import type { Selection } from "../../application/dossiers.ts";
import type { StructuredModel } from "./structured.ts";
import { createMessages } from "../openai/messages.ts";
import { createSourceCatalog } from "../openai/sources.ts";
import { createExtractionSchema } from "../openai/extraction.ts";
import { mapExtraction } from "../openai/map-extraction.ts";
import { PROMPT_VERSION, SCHEMA_VERSION } from "../openai/request.ts";

export function createLangChainGateway(
  provider: Selection["provider"],
  invoke: StructuredModel,
): ModelGateway {
  return async ({ documents, model }, signal) => {
    const catalog = createSourceCatalog(documents);

    const schema = createExtractionSchema(catalog);

    const { value, metadata } = await invoke(
      {
        selection: { provider, model },
        messages: createMessages(documents),
        schema,
        name: "requirements_evidence",
        promptVersion: PROMPT_VERSION,
      },
      signal,
    );

    return {
      extraction: mapExtraction(schema.parse(value), catalog),
      metadata: { ...metadata, schemaVersion: SCHEMA_VERSION },
    };
  };
}
