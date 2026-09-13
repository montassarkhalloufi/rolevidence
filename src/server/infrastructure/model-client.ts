import { errorMessages } from "../application/locales/errors-fr.ts";
import { createOpenAIModel } from "./models/openai.ts";
import { createAnthropicModel } from "./models/anthropic.ts";
import { z } from "zod";
import type {
  StructuredModel,
  StructuredRequest,
} from "../adapters/models/structured.ts";
import { MODEL_TIMEOUT_MS } from "../adapters/models/settings.ts";
import { AppError } from "../application/errors.ts";
import { assertOutputIntegrity } from "../adapters/models/output-integrity.ts";

export type ModelKeys = {
  openai: string | undefined;
  anthropic: string | undefined;
};

function modelFor(
  request: StructuredRequest,
  keys: ModelKeys,
  transport: typeof fetch,
) {
  const { provider } = request.selection;

  const apiKey = keys[provider];

  if (!apiKey) {
    throw new AppError("NOT_CONFIGURED", errorMessages.modelUnconfigured);
  }

  return provider === "openai"
    ? createOpenAIModel(request, apiKey, transport)
    : createAnthropicModel(request, apiKey, transport);
}

function safeModelError(error: unknown, signal: AbortSignal): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (signal.aborted) {
    return new AppError("TIMEOUT", errorMessages.providerTimeout);
  }

  return new AppError("PROVIDER_ERROR", errorMessages.providerFailed);
}

export function createStructuredModel(
  keys: ModelKeys,
  transport: typeof fetch = fetch,
): StructuredModel {
  let pending = false;

  return async (request, signal) => {
    if (pending) {
      throw new AppError("BUSY", errorMessages.providerBusy);
    }

    pending = true;
    const started = performance.now();

    const timeout = AbortSignal.timeout(MODEL_TIMEOUT_MS);

    const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;

    try {
      const response = await modelFor(request, keys, transport).invoke(
        request.messages,
        {
          signal: bounded,
          callbacks: [],
          configurable: {},
        },
      );

      return modelResult(request, response, started);
    } catch (error) {
      throw safeModelError(error, bounded);
    } finally {
      pending = false;
    }
  };
}

function modelResult(
  request: StructuredRequest,
  response: Awaited<ReturnType<ReturnType<typeof modelFor>["invoke"]>>,
  started: number,
) {
  const finish = response.raw.response_metadata;

  validateCompletion(finish, response.raw.additional_kwargs);
  const usage = z
    .object({
      usage_metadata: z
        .object({ input_tokens: z.number(), output_tokens: z.number() })
        .optional(),
    })
    .parse(response.raw).usage_metadata;

  const parsed = request.schema.safeParse(response.parsed);

  if (!parsed.success) {
    throw new AppError("INVALID_OUTPUT", errorMessages.invalidModelOutput);
  }

  assertOutputIntegrity(parsed.data);

  return {
    value: parsed.data,
    metadata: {
      provider: request.selection.provider,
      model:
        typeof finish.model_name === "string"
          ? finish.model_name
          : request.selection.model,
      responseId: response.raw.id ?? "unavailable",
      durationMs: Math.round(performance.now() - started),
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      promptVersion: request.promptVersion,
    },
  };
}

function validateCompletion(
  finish: Record<string, unknown>,
  extra: Record<string, unknown>,
) {
  if (
    finish.stop_reason === "max_tokens" ||
    finish.finish_reason === "length" ||
    finish.status === "incomplete"
  ) {
    throw new AppError("INCOMPLETE", errorMessages.incompleteModelOutput);
  }

  if (finish.stop_reason === "refusal" || extra.refusal) {
    throw new AppError("REFUSAL", errorMessages.providerRefusal);
  }
}
