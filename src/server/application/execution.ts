import type { ModelMetadata } from "./analyze.ts";

export type AnalysisProgress = {
  stage: "preparation" | "comparison" | "saving";
  completed: number;
  total: number;
};

export type AnalysisCheckpoint = {
  version: string;
  responses: {
    name: string;
    promptVersion: string;
    value: unknown;
    metadata: ModelMetadata;
  }[];
};

export type AnalysisExecution = {
  checkpoint: AnalysisCheckpoint | null;
  onCheckpoint: (value: AnalysisCheckpoint) => void;
  onProgress: (value: AnalysisProgress) => void;
};
