import { MODEL_NAME_MAX_CHARACTERS } from "./limits.ts";
import { z } from "zod";

export const ModelSelection = z
  .object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string().min(1).max(MODEL_NAME_MAX_CHARACTERS),
  })
  .strict();

export type ModelSelectionData = z.infer<typeof ModelSelection>;

export const ProviderOption = ModelSelection.extend({
  configured: z.boolean(),
});
