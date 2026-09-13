import { OFFER_MAX_FIELDS } from "../../../shared/limits.ts";
import { offerExtractionInstructions } from "./prompts/job-extraction.ts";
import { z } from "zod";
import { OfferField } from "../../../shared/case-files.ts";
import { resolveQuote } from "../../domain/quotes.ts";
import type { StructuredModel } from "./structured.ts";
import type { Selection } from "../../application/case-files.ts";

export const JobExtraction = z
  .object({ fields: z.array(OfferField).max(OFFER_MAX_FIELDS) })
  .strict();

export function createJobExtractor(invoke: StructuredModel) {
  return async (text: string, selection: Selection) => {
    const result = await invoke({
      selection,
      schema: JobExtraction,
      name: "job_fields",
      promptVersion: "job-fields-v1",
      messages: [
        {
          role: "system",
          content: offerExtractionInstructions,
        },
        { role: "user", content: JSON.stringify({ page: text }) },
      ],
    });

    const { fields } = JobExtraction.parse(result.value);

    const verified = fields.flatMap((field) => {
      const quote = resolveQuote(text, field.quote);

      return quote ? [{ ...field, quote }] : [];
    });

    return {
      fields: verified,
      rejectedFields: fields.length - verified.length,
      metadata: result.metadata,
    };
  };
}
