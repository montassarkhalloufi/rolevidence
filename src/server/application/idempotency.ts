import type { AnalysisOutput } from "./analyze.ts";
import { AppError } from "./errors.ts";

export type AnalysisEntry = {
  fingerprint: string;
  result: Promise<AnalysisOutput>;
};

export interface AnalysisStore {
  get(key: string): AnalysisEntry | undefined;
  set(key: string, entry: AnalysisEntry): void;
  settle(key: string): void;
}

export function createIdempotentAnalysis(store: AnalysisStore) {
  let active = false;

  return (
    key: string,
    fingerprint: string,
    execute: () => Promise<AnalysisOutput>,
  ) => {
    const previous = store.get(key);

    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "Cette clé correspond à une autre demande.",
        );
      }

      return { result: previous.result, replayed: true };
    }

    if (active) {
      throw new AppError(
        "BUSY",
        "Une analyse est déjà en cours. Attendez sa fin.",
      );
    }

    // Reserve before execution, including synchronous failures. Store failures as well:
    // a lost provider response must not cause an automatic second paid request.
    const deferred = Promise.withResolvers<AnalysisOutput>();

    store.set(key, { fingerprint, result: deferred.promise });
    active = true;
    void Promise.resolve()
      .then(execute)
      .finally(() => {
        active = false;
        store.settle(key);
      })
      .then(deferred.resolve, deferred.reject);

    return { result: deferred.promise, replayed: false };
  };
}
