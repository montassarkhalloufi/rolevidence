import { z } from "zod";
import { AnalysisResponse, Preferences } from "./analysis.ts";
import { ModelSelection } from "./providers.ts";
import { DOCUMENT_MAX_CHARACTERS } from "./limits.ts";

export const OfferField = z
  .object({
    name: z.enum([
      "title",
      "company",
      "location",
      "responsibilities",
      "skills",
      "experience",
      "requirements",
      "contract",
      "salary",
      "workMode",
    ]),
    value: z.string().max(4000),
    quote: z.string().max(4000),
  })
  .strict();

export const OfferSource = z
  .object({
    url: z.url().max(2048),
    retrievedAt: z.iso.datetime(),
    text: z.string().max(DOCUMENT_MAX_CHARACTERS),
    fields: z.array(OfferField).max(40),
  })
  .strict();

export const DossierDraft = z
  .object({
    title: z.string().trim().min(1).max(120),
    purpose: z.enum(["job_search", "recruiting"]),
    documents: z
      .object({
        reviewedJobQuotes: z.array(z.string().max(16000)).max(128).optional(),
        clarifications: z.string().max(DOCUMENT_MAX_CHARACTERS).optional(),
        profile: z.string().max(DOCUMENT_MAX_CHARACTERS),
        job: z.string().max(DOCUMENT_MAX_CHARACTERS),
        preferences: Preferences,
      })
      .strict(),
    selection: ModelSelection,
    offerSource: OfferSource.nullable(),
  })
  .strict();

export const Dossier = DossierDraft.extend({
  id: z.uuid(),
  revision: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const SavedAnalysis = z.object({
  id: z.uuid(),
  dossierId: z.uuid(),
  createdAt: z.iso.datetime(),
  snapshot: Dossier,
  result: AnalysisResponse,
});

export const DossierSummary = Dossier.pick({
  id: true,
  title: true,
  purpose: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
});

export const DossierPage = z.object({
  items: z.array(DossierSummary),
  total: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
});

export const AnalysisPage = z.object({
  items: z.array(SavedAnalysis),
  total: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
});

export const DossierSave = z
  .object({ draft: DossierDraft, revision: z.number().int().nonnegative() })
  .strict();

export type DossierData = z.infer<typeof Dossier>;

export type DossierDraftData = z.infer<typeof DossierDraft>;

export type SavedAnalysisData = z.infer<typeof SavedAnalysis>;

export type OfferSourceData = z.infer<typeof OfferSource>;

export const BACKUP_MAX_BYTES = 8 * 1024 * 1024;

export const BACKUP_MAX_ANALYSES = 100;

export const Backup = z
  .object({
    format: z.literal("rolevidence-backup-v1"),
    dossier: Dossier,
    analyses: z.array(SavedAnalysis).max(BACKUP_MAX_ANALYSES),
  })
  .strict()
  .refine(
    (backup) =>
      backup.analyses.every(
        (analysis) =>
          analysis.dossierId === backup.dossier.id &&
          analysis.snapshot.id === backup.dossier.id,
      ),
    "Inconsistent dossier sources",
  );

export type BackupData = z.infer<typeof Backup>;
