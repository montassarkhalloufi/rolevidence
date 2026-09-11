import type {
  DocumentsInput,
  ExtractionResult,
  AnalysisResult,
} from "../domain/models.ts";
import { classifyRequirements } from "../domain/classify.ts";

export type ModelMetadata = {
  responseId: string;
  model: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  promptVersion?: string;
  schemaVersion?: string;
};

export type AnalysisOutput = {
  analysis: AnalysisResult;
  metadata: ModelMetadata;
};

export type AnalysisRequest = { documents: DocumentsInput; model: string };

export type ModelGateway = (
  request: AnalysisRequest,
  signal?: AbortSignal,
) => Promise<{ extraction: ExtractionResult; metadata: ModelMetadata }>;

export type RequestPreview = (
  documents: DocumentsInput,
  model: string,
) => unknown;

export type AnalysisService = ReturnType<typeof createAnalysisService>;

export function createAnalysisService(
  model: string,
  gateway: ModelGateway,
  preview: RequestPreview = (documents, model) => ({ documents, model }),
) {
  return {
    preview: (documents: DocumentsInput) => preview(documents, model),
    analyze: async (
      documents: DocumentsInput,
      signal?: AbortSignal,
    ): Promise<AnalysisOutput> => {
      const { extraction, metadata } = await gateway(
        { documents, model },
        signal,
      );

      return {
        analysis: classifyRequirements(extraction, documents),
        metadata,
      };
    },
  };
}
