import { ModelSelection, ProviderOption } from "./providers.ts";
import {
  DOCUMENT_MAX_CHARACTERS,
  MAX_ANNUAL_SALARY_EUR,
  MIN_HYBRID_REMOTE_DAYS,
  MAX_HYBRID_REMOTE_DAYS,
} from "./limits.ts";
import { z } from "zod";

export const EvidenceState = z.enum([
  "supported",
  "contradicted",
  "insufficient_information",
]);

export const Interpretation = z
  .object({
    describedPractice: z
      .string()
      .nullable()
      .describe(
        "Pratique réellement décrite dans la source, sans inventer d'expérience.",
      ),
    relation: z.enum([
      "equivalence",
      "indirect_evidence",
      "contradiction",
      "insufficient_information",
    ]),
    justification: z
      .string()
      .describe(
        "Explique pourquoi la pratique répond ou non à cette exigence précise, en distinguant niveau et contexte.",
      ),
  })
  .strict();

export const finding = z
  .object({
    clarificationQuote: z.string().nullable().optional(),
    subject: z.string(),
    interpretation: Interpretation,
    evidenceState: EvidenceState,
    verification: z
      .object({
        code: z.enum([
          "UNVERIFIED_QUOTES",
          "MISSING_CANDIDATE_INFORMATION",
          "INCOMPARABLE_EXPERIENCE",
          "MISSING_REQUIREMENT_ANALYSIS",
        ]),
        missingQuotes: z.array(z.enum(["candidate", "job"])),
        proposedCandidateQuote: z.string().nullable(),
        proposedJobQuote: z.string().nullable(),
      })
      .strict()
      .nullable(),
    explanation: z.string(),
    profileQuote: z
      .string()
      .nullable()
      .describe("Citation exacte ou null si absente."),
    preferencesQuote: z
      .string()
      .nullable()
      .describe(
        "Valeur des préférences utilisée, ou null. Jamais une citation du CV.",
      ),
    jobQuote: z
      .string()
      .nullable()
      .describe("Citation exacte ou null si absente."),
  })
  .strict();

// Un seul contrat : type TypeScript inféré et validation à l'exécution.
export const Analysis = z
  .object({
    matches: z.array(finding),
    gaps: z.array(finding),
    unknowns: z.array(finding),
    needsReview: z.array(finding),
  })
  .strict();

export type AnalysisResult = z.infer<typeof Analysis>;

export const Preferences = z
  .object({
    minimumAnnualSalary: z
      .number()
      .int()
      .positive()
      .max(MAX_ANNUAL_SALARY_EUR)
      .nullable(),
    workMode: z.enum(["onsite", "hybrid", "remote"]).nullable(),
    remoteDaysPerWeek: z
      .number()
      .int()
      .min(MIN_HYBRID_REMOTE_DAYS)
      .max(MAX_HYBRID_REMOTE_DAYS)
      .nullable(),
  })
  .strict()
  .refine(
    (value) => value.workMode === "hybrid" || value.remoteDaysPerWeek === null,
    {
      message:
        "Les jours de télétravail concernent uniquement le mode hybride.",
      path: ["remoteDaysPerWeek"],
    },
  );

export type PreferencesInput = z.infer<typeof Preferences>;

export const emptyPreferences: PreferencesInput = {
  minimumAnnualSalary: null,
  workMode: null,
  remoteDaysPerWeek: null,
};

export const Documents = z
  .object({
    reviewedJobQuotes: z.array(z.string().max(16000)).max(128).optional(),
    clarifications: z.string().max(DOCUMENT_MAX_CHARACTERS).optional(),
    preferences: Preferences.optional(),
    profile: z
      .string()
      .trim()
      .min(1, "Le profile est requis.")
      .max(DOCUMENT_MAX_CHARACTERS),
    job: z
      .string()
      .trim()
      .min(1, "L'offre est requise.")
      .max(DOCUMENT_MAX_CHARACTERS),
  })
  .strict();

export type DocumentsInput = z.infer<typeof Documents>;

export const AnalysisResponse = z.object({
  analysis: Analysis,
  metadata: z.object({
    preparationVersion: z.string().optional(),
    contextPassages: z
      .array(z.object({ quote: z.string(), reason: z.string() }))
      .optional(),
    provider: z.enum(["openai", "anthropic"]).optional(),
    responseId: z.string(),
    model: z.string(),
    durationMs: z.number(),
    inputTokens: z.number().nullable(),
    outputTokens: z.number().nullable(),
    promptVersion: z.string().optional(),
    schemaVersion: z.string().optional(),
  }),
});

export type AnalysisResponseData = z.infer<typeof AnalysisResponse>;

export const Bootstrap = z.object({
  documents: Documents,
  model: z.string(),
  configured: z.boolean(),
  providers: z.array(ProviderOption).optional(),
  dossiersEnabled: z.boolean().optional(),
});

export type BootstrapData = z.infer<typeof Bootstrap>;

export const AnalysisInput = Documents.extend({
  selection: ModelSelection.optional(),
  dossierId: z.uuid().optional(),
  dossierRevision: z.number().int().positive().optional(),
});

export type AnalysisInputData = z.infer<typeof AnalysisInput>;
