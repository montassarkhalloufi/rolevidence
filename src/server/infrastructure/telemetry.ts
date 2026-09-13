import { randomUUID } from "node:crypto";
import { Client } from "langsmith";
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
): TelemetrySink {
  const client = new Client({
    apiKey,
    timeout_ms: TELEMETRY_TIMEOUT_MS,
    autoBatchTracing: false,
    callerOptions: { maxRetries: 0 },
    hideInputs: true,
    hideOutputs: true,
  });

  let pending = 0;

  return async (event) => {
    if (pending >= MAX_PENDING_TELEMETRY_EVENTS) {
      return;
    }

    pending++;
    try {
      const end = Date.now();

      await client.createRun({
        id: randomUUID(),
        name: "rolevidence.structured-model",
        run_type: "llm",
        project_name: project,
        inputs: {},
        outputs: {},
        start_time: end - event.durationMs,
        end_time: end,
        extra: { metadata: { ...event } },
        ...(event.errorCode ? { error: event.errorCode } : {}),
      });
    } finally {
      pending--;
    }
  };
}
