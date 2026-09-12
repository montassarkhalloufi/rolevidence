import type { StructuredModel } from "./structured.ts";
import type { AnalysisExecution } from "../../application/execution.ts";
import { AppError } from "../../application/errors.ts";

const CHECKPOINT_VERSION = "comparison-checkpoint-v1";

export function checkpointInvoker(
  invoke: StructuredModel,
  execution?: AnalysisExecution,
  signal?: AbortSignal,
): StructuredModel {
  const checkpoint = execution?.checkpoint;

  if (checkpoint && checkpoint.version !== CHECKPOINT_VERSION) {
    throw new AppError(
      "INVALID_INPUT",
      "Cette analyse nécessite une nouvelle demande après la mise à jour.",
    );
  }

  const responses = [...(checkpoint?.responses ?? [])];

  let position = 0;

  return async (request, requestSignal) => {
    signal?.throwIfAborted();
    const saved = responses[position];

    if (saved) {
      if (
        saved.name !== request.name ||
        saved.promptVersion !== request.promptVersion
      ) {
        throw new AppError(
          "INVALID_INPUT",
          "Les étapes ont changé. Lancez une nouvelle analyse.",
        );
      }

      position++;

      return {
        value: request.schema.parse(saved.value),
        metadata: saved.metadata,
      };
    }

    const result = await invoke(request, requestSignal);

    const value = request.schema.parse(result.value);

    responses.push({
      name: request.name,
      promptVersion: request.promptVersion,
      value,
      metadata: result.metadata,
    });
    execution?.onCheckpoint({
      version: CHECKPOINT_VERSION,
      responses: [...responses],
    });
    position++;
    signal?.throwIfAborted();

    return { value, metadata: result.metadata };
  };
}
