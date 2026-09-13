import { errorMessages } from "./locales/errors-fr.ts";
import type { AnalysisService } from "./analyze.ts";
import type { Selection } from "./case-files.ts";
import { AppError } from "./errors.ts";

export type ProviderOption = Selection & { configured: boolean };

export type ProviderRegistry = {
  options: ProviderOption[];
  resolve(selection?: Selection, requireConfigured?: boolean): AnalysisService;
};

export function createProviderRegistry(
  entries: { option: ProviderOption; service: AnalysisService }[],
): ProviderRegistry {
  return {
    options: entries.map((entry) => entry.option),
    resolve: (selection, requireConfigured = true) => {
      const entry = selection
        ? entries.find(
            ({ option }) =>
              option.provider === selection.provider &&
              option.model === selection.model,
          )
        : (entries.find(({ option }) => option.configured) ?? entries[0]);

      if (!entry) {
        throw new AppError("INVALID_INPUT", errorMessages.modelUnsupported);
      }

      if (requireConfigured && !entry.option.configured) {
        throw new AppError(
          "NOT_CONFIGURED",
          errorMessages.providerUnconfigured,
        );
      }

      return entry.service;
    },
  };
}
