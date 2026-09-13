import { z } from "zod";
import { ModelSelection } from "./providers.ts";
import { OfferSource } from "./case-files.ts";
import { AnalysisResponse } from "./analysis.ts";

export const OfferImportInput = z
  .object({ url: z.url().max(2048), selection: ModelSelection })
  .strict();

export const OfferImportResponse = z.object({
  source: OfferSource,
  metadata: AnalysisResponse.shape.metadata,
  rejectedFields: z.number().int().nonnegative(),
});
