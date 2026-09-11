import type { createAnalysisRequest } from "./request.ts";

export type ProviderResponse = {
  id: string;
  model: string;
  status?: string;
  output_text: string;
  output: ReadonlyArray<{
    type: string;
    content?: ReadonlyArray<{ type: string }>;
  }>;
  usage?: { input_tokens: number; output_tokens: number };
};

export type ResponseTransport = (
  request: ReturnType<typeof createAnalysisRequest>,
  signal?: AbortSignal,
) => Promise<ProviderResponse>;
