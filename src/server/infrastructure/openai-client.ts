import { errorMessages } from "../application/locales/errors-fr.ts";
import OpenAI from "openai";
import { AppError } from "../application/errors.ts";
import type { ResponseTransport } from "../adapters/openai/transport.ts";
import { MODEL_TIMEOUT_MS } from "../adapters/models/settings.ts";

function transportError(error: unknown): AppError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AppError("TIMEOUT", errorMessages.openaiTimeout);
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new AppError("CONNECTION", errorMessages.openaiConnection);
  }

  if (error instanceof OpenAI.APIError && error.status === 429) {
    return new AppError("PROVIDER_ERROR", errorMessages.openaiQuota);
  }

  return new AppError("PROVIDER_ERROR", errorMessages.openaiFailed);
}

export function createOpenAITransport(
  apiKey: string | undefined,
): ResponseTransport {
  const client = apiKey
    ? new OpenAI({ apiKey, timeout: MODEL_TIMEOUT_MS, maxRetries: 0 })
    : null;

  return async (request, signal) => {
    if (!client) {
      throw new AppError("NOT_CONFIGURED", errorMessages.openaiUnconfigured);
    }

    try {
      return await client.responses.create(request, signal ? { signal } : {});
    } catch (error) {
      throw transportError(error);
    }
  };
}
