import {
  OFFER_FIELD_MAX_CHARACTERS,
  OFFER_MAX_FIELDS,
  URL_MAX_CHARACTERS,
} from "./limits.ts";
import { TITLE_MAX_CHARACTERS, REVIEWED_QUOTES_MAX_COUNT } from "./limits.ts";
import { Tracking } from "./tracking.ts";
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
    value: z.string().max(OFFER_FIELD_MAX_CHARACTERS),
    quote: z.string().max(OFFER_FIELD_MAX_CHARACTERS),
  })
  .strict();

export const OfferSource = z
  .object({
    url: z.url().max(URL_MAX_CHARACTERS),
    retrievedAt: z.iso.datetime(),
    text: z.string().max(DOCUMENT_MAX_CHARACTERS),
    fields: z.array(OfferField).max(OFFER_MAX_FIELDS),
  })
  .strict();

export const CaseFileDraft = z
  .object({
    tracking: Tracking.optional(),
    title: z.string().trim().min(1).max(TITLE_MAX_CHARACTERS),
    purpose: z.enum(["job_search", "recruiting"]),
    documents: z
      .object({
        reviewedJobQuotes: z
          .array(z.string().max(DOCUMENT_MAX_CHARACTERS))
          .max(REVIEWED_QUOTES_MAX_COUNT)
          .optional(),
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

export const CaseFile = CaseFileDraft.extend({
  id: z.uuid(),
  revision: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const SavedAnalysis = z.object({
  id: z.uuid(),
  dossierId: z.uuid(),
  createdAt: z.iso.datetime(),
  snapshot: CaseFile,
  result: AnalysisResponse,
});

export const CaseFileSummary = CaseFile.pick({
  id: true,
  title: true,
  purpose: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
});

export const CaseFilePage = z.object({
  items: z.array(CaseFileSummary),
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

export const CaseFileSave = z
  .object({ draft: CaseFileDraft, revision: z.number().int().nonnegative() })
  .strict();

export type CaseFileData = z.infer<typeof CaseFile>;

export type CaseFileDraftData = z.infer<typeof CaseFileDraft>;

export type SavedAnalysisData = z.infer<typeof SavedAnalysis>;

export type OfferSourceData = z.infer<typeof OfferSource>;

export const BACKUP_MAX_BYTES = 8 * 1024 * 1024;

export const BACKUP_MAX_ANALYSES = 100;

export const Backup = z
  .object({
    format: z.literal("rolevidence-backup-v1"),
    dossier: CaseFile,
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
