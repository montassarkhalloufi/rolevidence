import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import type {
  StructuredModel,
  StructuredRequest,
} from "../adapters/models/structured.ts";
import {
  MODEL_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
} from "../adapters/openai/request.ts";
import { AppError } from "../application/errors.ts";

export type ModelKeys = {
  openai: string | undefined;
  anthropic: string | undefined;
};

function modelFor(
  request: StructuredRequest,
  keys: ModelKeys,
  transport: typeof fetch,
) {
  const { provider, model } = request.selection;

  const apiKey = keys[provider];

  if (!apiKey) {
    throw new AppError(
      "NOT_CONFIGURED",
      "Configurez la clé de ce fournisseur dans .env.",
    );
  }

  if (provider === "openai") {
    return new ChatOpenAI({
      apiKey,
      model,
      useResponsesApi: true,
      modelKwargs: { store: false },
      configuration: { fetch: transport },
      maxRetries: 0,
      timeout: MODEL_TIMEOUT_MS,
      maxTokens: MAX_OUTPUT_TOKENS,
    }).withStructuredOutput(z.toJSONSchema(request.schema), {
      name: request.name,
      method: "jsonSchema",
      strict: true,
      includeRaw: true,
    });
  }

  return new ChatAnthropic({
    apiKey,
    model,
    maxRetries: 0,
    maxTokens: MAX_OUTPUT_TOKENS,
    clientOptions: { fetch: transport },
  }).withStructuredOutput(z.toJSONSchema(request.schema), {
    name: request.name,
    method: "jsonSchema",
    includeRaw: true,
  });
}

function safeModelError(error: unknown, signal: AbortSignal): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (signal.aborted) {
    return new AppError(
      "TIMEOUT",
      "Le fournisseur n’a pas répondu dans le délai imparti.",
    );
  }

  return new AppError(
    "PROVIDER_ERROR",
    "L’appel au fournisseur a échoué. Aucune nouvelle tentative automatique.",
  );
}

export function createStructuredModel(
  keys: ModelKeys,
  transport: typeof fetch = fetch,
): StructuredModel {
  return async (request, signal) => {
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
    throw new AppError(
      "INVALID_OUTPUT",
      "La réponse ne respecte pas le contrat de données.",
    );
  }

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
    throw new AppError(
      "INCOMPLETE",
      "La réponse est incomplète. Aucune analyse validée.",
    );
  }

  if (finish.stop_reason === "refusal" || extra.refusal) {
    throw new AppError("REFUSAL", "Le fournisseur a refusé cette demande.");
  }
}
