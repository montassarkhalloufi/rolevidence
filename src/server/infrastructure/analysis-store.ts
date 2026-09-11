import type { AnalysisOutput } from "../application/analyze.ts";
import type {
  AnalysisEntry,
  AnalysisStore,
} from "../application/idempotency.ts";
import { AppError } from "../application/errors.ts";

export const IDEMPOTENCY_TTL_MS = 5 * 60_000;

export const IDEMPOTENCY_CAPACITY = 100;

export function createMemoryAnalysisStore<T = AnalysisOutput>(
  ttlMs = IDEMPOTENCY_TTL_MS,
  capacity = IDEMPOTENCY_CAPACITY,
): AnalysisStore<T> {
  const entries = new Map<string, AnalysisEntry<T>>();

  return {
    get: (key) => entries.get(key),
    set: (key, entry) => {
      if (entries.size >= capacity) {
        throw new AppError(
          "CAPACITY",
          "Capacité temporairement atteinte. Réessayez plus tard.",
        );
      }

      entries.set(key, entry);
    },
    settle: (key) => {
      setTimeout(() => entries.delete(key), ttlMs).unref();
    },
  };
}
