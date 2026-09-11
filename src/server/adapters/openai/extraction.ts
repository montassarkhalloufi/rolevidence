import { z } from "zod";
import { Interpretation } from "../../../shared/analysis.ts";
import type { SourceCatalog, SourcePassage } from "./sources.ts";

function reference(passages: SourcePassage[]) {
  const [first, ...rest] = passages.map((passage) => passage.id);

  return first ? z.enum([first, ...rest]).nullable() : z.null();
}

export function createExtractionSchema(catalog: SourceCatalog) {
  const requirement = z
    .object({
      subject: z
        .string()
        .describe(
          "Libellé en français. Une exigence atomique, une technologie par ligne.",
        ),
      explanation: z.string(),
      interpretation: Interpretation,
      candidateInformation: z.enum(["provided", "not_provided"]),
      candidateSource: z.enum(["profile", "preferences"]),
      profileEvidenceId: reference(catalog.profile).describe(
        "Select the exact supporting profile passage, or null. Never invent a quote.",
      ),
      profileEvidenceQuote: z
        .string()
        .nullable()
        .describe(
          "Court extrait EXACT et contigu du CV qui soutient cette exigence précise. Copier sans ellipse ni reformulation. Null si aucune preuve candidate. Un extrait sur l'ancienneté générale ne soutient pas une technologie.",
        ),
      preferencesEvidenceId: reference(catalog.preferences),
      jobEvidenceId: reference(catalog.job).describe(
        "Select the entire original job passage, including a shared technology list. Required for every requirement.",
      ),
      experienceComparison: z
        .object({
          comparableScope: z
            .boolean()
            .describe(
              "True only when both durations measure the same kind of experience; fullstack total is not backend duration.",
            ),
          candidateDuration: z.enum(["exact", "lower_bound", "unknown"]),
        })
        .strict()
        .nullable()
        .describe(
          "Required for duration requirements. A plus sign or at least means lower_bound, never exact. Null for other criteria.",
        ),
    })
    .strict();

  return z.object({ requirements: z.array(requirement) }).strict();
}

export type ProviderExtraction = z.infer<
  ReturnType<typeof createExtractionSchema>
>;
