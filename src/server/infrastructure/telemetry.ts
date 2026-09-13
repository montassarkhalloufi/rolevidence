import { randomUUID } from "node:crypto";
import type { StructuredModel } from "../adapters/models/structured.ts";
import { AppError } from "../application/errors.ts";

const TELEMETRY_TIMEOUT_MS = 2000;

const MAX_PENDING_TELEMETRY_EVENTS = 10;

export type TechnicalEvent = {
  provider: string;
  model: string;
  promptVersion: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  errorCode: string | null;
};

export type TelemetrySink = (event: TechnicalEvent) => Promise<void>;

export function observeModel(
  invoke: StructuredModel,
  sink?: TelemetrySink,
): StructuredModel {
  return async (request, signal) => {
    const started = performance.now();

    const event: TechnicalEvent = {
      provider: request.selection.provider,
      model: request.selection.model,
      promptVersion: request.promptVersion,
      durationMs: 0,
      inputTokens: null,
      outputTokens: null,
      errorCode: null,
    };

    try {
      const result = await invoke(request, signal);

      event.inputTokens = result.metadata.inputTokens;
      event.outputTokens = result.metadata.outputTokens;

      return result;
    } catch (error) {
      event.errorCode =
        error instanceof AppError ? error.code : "PROVIDER_ERROR";
      throw error;
    } finally {
      event.durationMs = Math.round(performance.now() - started);
      if (sink) {
        void Promise.resolve()
          .then(() => sink(event))
          .catch(() => {});
      }
    }
  };
}

export function createLangSmithSink(
  apiKey: string,
  project: string,
  transport: typeof fetch = fetch,
): TelemetrySink {
  const endpoint =
    process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com";

  const workspace = process.env.LANGSMITH_WORKSPACE_ID;

  let pending = 0;

  return async (event) => {
    if (pending >= MAX_PENDING_TELEMETRY_EVENTS) {
      return;
    }

    pending++;
    try {
      const end = Date.now();

      const response = await transport(
        new URL("runs", `${endpoint.replace(/\/$/, "")}/`),
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS),
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            ...(workspace ? { "x-tenant-id": workspace } : {}),
          },
          body: JSON.stringify({
            id: randomUUID(),
            name: "rolevidence.structured-model",
            run_type: "llm",
            session_name: project,
            inputs: {},
            outputs: {},
            start_time: new Date(end - event.durationMs).toISOString(),
            end_time: new Date(end).toISOString(),
            extra: { metadata: { ...event } },
            ...(event.errorCode ? { error: event.errorCode } : {}),
          }),
        },
      );

      await response.body?.cancel();
      if (!response.ok) {
        throw new Error(`Telemetry rejected: HTTP ${response.status}`);
      }
    } finally {
      pending--;
    }
  };
}
