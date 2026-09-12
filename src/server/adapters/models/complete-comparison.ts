import type { AnalysisProgress } from "../../application/execution.ts";
import { z } from "zod";
import type { StructuredModel } from "./structured.ts";
import type { Selection } from "../../application/dossiers.ts";
import type { DocumentsInput, Requirement } from "../../domain/models.ts";
import type { SourceCatalog } from "../openai/sources.ts";
import type { ModelMetadata } from "../../application/analyze.ts";
import { createExtractionSchema } from "../openai/extraction.ts";
import { createMessages } from "../openai/messages.ts";
import { mapExtraction } from "../openai/map-extraction.ts";
import { AppError } from "../../application/errors.ts";

export const COMPARISON_VERSION = "evidence-v4.1-source-integrity";

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
    throw new AppError(
      "INVALID_INPUT",
      "L’offre contient trop de passages. Regroupez les lignes avant de relancer l’analyse.",
    );
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
          batch.job.map(({ id }) => [id, z.array(item).min(1)]),
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
            content:
              "Réponds dans chaque clé J demandée avec toutes ses exigences atomiques. Ne regroupe pas plusieurs technologies dans une conclusion. Chaque clé exige au moins une analyse ; un fait non établi reste inconnu. Les autres passages de l’offre peuvent être utiles au contexte mais seules les clés de ce lot sont à évaluer.",
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
