import { schemaMessages } from "../../../shared/locales/schema-fr.ts";
import { z } from "zod";
import {
  Interpretation,
  EducationComparison,
} from "../../../shared/analysis.ts";
import type { SourceCatalog, SourcePassage } from "./sources.ts";

function reference(passages: SourcePassage[]) {
  const [first, ...rest] = passages.map((passage) => passage.id);

  return first ? z.enum([first, ...rest]).nullable() : z.null();
}

export function createExtractionSchema(catalog: SourceCatalog) {
  const requirement = z
    .object({
      subject: z.string().describe(schemaMessages.subjectDescription),
      explanation: z.string(),
      interpretation: Interpretation,
      candidateInformation: z.enum(["provided", "not_provided"]),
      candidateSource: z.enum(["profile", "preferences", "clarification"]),
      profileEvidenceId: reference([
        ...catalog.profile,
        ...catalog.clarifications,
      ]).describe(schemaMessages.profileEvidenceIdDescription),
      profileEvidenceQuote: z
        .string()
        .nullable()
        .describe(schemaMessages.profileEvidenceQuoteDescription),
      preferencesEvidenceId: reference(catalog.preferences),
      jobEvidenceId: reference(catalog.job).describe(
        schemaMessages.jobEvidenceIdDescription,
      ),
      educationComparison: EducationComparison.nullable().describe(
        schemaMessages.educationComparisonDescription,
      ),
      experienceComparison: z
        .object({
          comparableScope: z
            .boolean()
            .describe(schemaMessages.comparableScopeDescription),
          candidateDuration: z.enum(["exact", "lower_bound", "unknown"]),
        })
        .strict()
        .nullable()
        .describe(schemaMessages.experienceComparisonDescription),
    })
    .strict();

  return z.object({ requirements: z.array(requirement) }).strict();
}

export type ProviderExtraction = z.infer<
  ReturnType<typeof createExtractionSchema>
>;
