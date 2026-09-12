import { z } from "zod";
import { Dossier, DossierDraft, SavedAnalysis } from "./dossiers.ts";

export const CAMPAIGN_MAX_MEMBERS = 10;

export { Tracking, TRACKING_MAX_CHARACTERS } from "./tracking.ts";

export const CampaignInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    baseId: z.uuid(),
    baseRevision: z.number().int().positive(),
    members: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(120),
            text: z.string().trim().min(1).max(16000),
          })
          .strict(),
      )
      .min(2)
      .max(CAMPAIGN_MAX_MEMBERS),
  })
  .strict();

export const Campaign = z.object({
  id: z.uuid(),
  title: z.string(),
  purpose: DossierDraft.shape.purpose,
  createdAt: z.iso.datetime(),
  members: z.array(
    z.object({ dossier: Dossier, latest: SavedAnalysis.nullable() }),
  ),
});

export const CampaignPage = z.object({
  items: z.array(Campaign.omit({ members: true })),
  total: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
});

export const JobProgress = z.object({
  stage: z.enum(["preparation", "comparison", "saving"]),
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const AnalysisJob = z.object({
  id: z.uuid(),
  dossierId: z.uuid(),
  revision: z.number().int().positive(),
  status: z.enum([
    "running",
    "cancelled",
    "interrupted",
    "failed",
    "completed",
  ]),
  progress: JobProgress,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  attempt: z.number().int().positive(),
  error: z.string().nullable(),
  result: SavedAnalysis.nullable(),
});

export const JobStart = z
  .object({ dossierId: z.uuid(), revision: z.number().int().positive() })
  .strict();

export const JobResume = z
  .object({ attempt: z.number().int().positive() })
  .strict();

export type AnalysisJobData = z.infer<typeof AnalysisJob>;

export type CampaignData = z.infer<typeof Campaign>;

export type CampaignInputData = z.infer<typeof CampaignInput>;
