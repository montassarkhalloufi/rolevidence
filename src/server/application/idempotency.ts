import { errorMessages } from "./locales/errors-fr.ts";
import type { AnalysisOutput } from "./analyze.ts";
import { AppError } from "./errors.ts";

export type AnalysisEntry<T = AnalysisOutput> = {
  fingerprint: string;
  result: Promise<T>;
};

export interface AnalysisStore<T = AnalysisOutput> {
  get(key: string): AnalysisEntry<T> | undefined;
  set(key: string, entry: AnalysisEntry<T>): void;
  settle(key: string): void;
}

export function createIdempotentAnalysis<T = AnalysisOutput>(
  store: AnalysisStore<T>,
) {
  let active = false;

  return (key: string, fingerprint: string, execute: () => Promise<T>) => {
    const previous = store.get(key);

    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          errorMessages.requestConflict,
        );
      }

      return { result: previous.result, replayed: true };
    }

    if (active) {
      throw new AppError("BUSY", errorMessages.analysisBusy);
    }

    // Reserve before execution, including synchronous failures. Store failures as well:
    // a lost provider response must not cause an automatic second paid request.
    const deferred = Promise.withResolvers<T>();

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
