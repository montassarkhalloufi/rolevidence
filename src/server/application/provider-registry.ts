import type { AnalysisService } from "./analyze.ts";
import type { Selection } from "./dossiers.ts";
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
        throw new AppError(
          "INVALID_INPUT",
          "Ce modèle n’est pas pris en charge.",
        );
      }

      if (requireConfigured && !entry.option.configured) {
        throw new AppError(
          "NOT_CONFIGURED",
          "Configurez la clé de ce fournisseur dans .env.",
        );
      }

      return entry.service;
    },
  };
}
