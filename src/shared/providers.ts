import { z } from "zod";

export const ModelSelection = z
  .object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string().min(1).max(120),
  })
  .strict();

export type ModelSelectionData = z.infer<typeof ModelSelection>;

export const ProviderOption = ModelSelection.extend({
  configured: z.boolean(),
});
