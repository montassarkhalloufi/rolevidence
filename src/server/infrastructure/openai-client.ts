import OpenAI from "openai";
import { AppError } from "../application/errors.ts";
import type { ResponseTransport } from "../adapters/openai/transport.ts";
import { MODEL_TIMEOUT_MS } from "../adapters/openai/request.ts";

function transportError(error: unknown): AppError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AppError(
      "TIMEOUT",
      "Le modèle a dépassé le délai de 120 secondes.",
    );
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new AppError("CONNECTION", "Connexion à OpenAI impossible.");
  }

  if (error instanceof OpenAI.APIError && error.status === 429) {
    return new AppError("PROVIDER_ERROR", "Limite ou quota OpenAI atteint.");
  }

  return new AppError("PROVIDER_ERROR", "L’appel au modèle a échoué.");
}

export function createOpenAITransport(
  apiKey: string | undefined,
): ResponseTransport {
  const client = apiKey
    ? new OpenAI({ apiKey, timeout: MODEL_TIMEOUT_MS, maxRetries: 0 })
    : null;

  return async (request, signal) => {
    if (!client) {
      throw new AppError(
        "NOT_CONFIGURED",
        "Le fournisseur IA n’est pas configuré.",
      );
    }

    try {
      return await client.responses.create(request, signal ? { signal } : {});
    } catch (error) {
      throw transportError(error);
    }
  };
}
