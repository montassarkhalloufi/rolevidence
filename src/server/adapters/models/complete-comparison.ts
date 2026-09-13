import { comparisonInstructions } from "./prompts/complete-comparison.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import type { AnalysisProgress } from "../../application/execution.ts";
import { z } from "zod";
import type { StructuredModel } from "./structured.ts";
import type { Selection } from "../../application/case-files.ts";
import type { DocumentsInput, Requirement } from "../../domain/models.ts";
import type { SourceCatalog } from "./sources.ts";
import type { ModelMetadata } from "../../application/analyze.ts";
import { createExtractionSchema } from "./extraction.ts";
import { createMessages } from "./messages.ts";
import { mapExtraction } from "./map-extraction.ts";
import { AppError } from "../../application/errors.ts";

export const COMPARISON_VERSION = "evidence-v6.1-qualified-conclusions";

export const COMPARISON_BATCH_SIZE = 8;

export const MAX_COMPARISON_BATCHES = 16;

export async function compareComplete(
  invoke: StructuredModel,
  documents: DocumentsInput,
  catalog: SourceCatalog,
  selection: Selection,
  signal?: AbortSignal,
  onProgress?: (value: AnalysisProgress) => void,
) {
  if (catalog.job.length > COMPARISON_BATCH_SIZE * MAX_COMPARISON_BATCHES) {
    throw new AppError("INVALID_INPUT", errorMessages.tooManyCriteria);
  }

  const requirements: Requirement[] = [];

  const metadata: ModelMetadata[] = [];

  for (
    let offset = 0;
    offset < catalog.job.length;
    offset += COMPARISON_BATCH_SIZE
  ) {
    const batch = {
      ...catalog,
      job: catalog.job.slice(offset, offset + COMPARISON_BATCH_SIZE),
    };

    const item = createExtractionSchema(batch).shape.requirements.element.omit({
      jobEvidenceId: true,
    });

    const schema = z
      .object(
        Object.fromEntries(
          batch.job.map(({ id, criterion }) => [
            id,
            criterion ? z.array(item).length(1) : z.array(item).min(1),
          ]),
        ),
      )
      .strict();

    signal?.throwIfAborted();
    onProgress?.({
      stage: "comparison",
      completed: offset / COMPARISON_BATCH_SIZE,
      total: Math.ceil(catalog.job.length / COMPARISON_BATCH_SIZE),
    });
    const response = await invoke(
      {
        selection,
        schema,
        name: "requirements_evidence",
        promptVersion: COMPARISON_VERSION,
        messages: [
          ...createMessages(documents, batch.job),
          {
            role: "user",
            content: comparisonInstructions,
          },
        ],
      },
      signal,
    );

    const value = schema.parse(response.value);

    const extraction = {
      requirements: Object.entries(value).flatMap(([jobEvidenceId, items]) =>
        items.map((entry) => ({ ...entry, jobEvidenceId })),
      ),
    };

    requirements.push(...mapExtraction(extraction, batch).requirements);
    metadata.push(response.metadata);
  }

  return { extraction: { requirements, unassessedJobQuotes: [] }, metadata };
}
