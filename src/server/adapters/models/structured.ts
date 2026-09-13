import type { z } from "zod";
import type { ModelMetadata } from "../../application/analyze.ts";
import type { Selection } from "../../application/case-files.ts";

export type StructuredRequest = {
  selection: Selection;
  messages: { role: "system" | "user"; content: string }[];
  schema: z.ZodType;
  name: string;
  promptVersion: string;
};

export type StructuredModel = (
  request: StructuredRequest,
  signal?: AbortSignal,
) => Promise<{ value: unknown; metadata: ModelMetadata }>;
