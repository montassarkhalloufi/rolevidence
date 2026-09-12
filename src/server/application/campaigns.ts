import type { Dossier, SavedAnalysis, Page } from "./dossiers.ts";

export type CampaignInput = {
  title: string;
  baseId: string;
  baseRevision: number;
  members: { title: string; text: string }[];
};

export type CampaignSummary = {
  id: string;
  title: string;
  purpose: "job_search" | "recruiting";
  createdAt: string;
};

export type Campaign = CampaignSummary & {
  members: { dossier: Dossier; latest: SavedAnalysis | null }[];
};

export interface CampaignRepository {
  create(id: string, input: CampaignInput): Campaign;
  get(id: string): Campaign;
  list(offset: number): Page<CampaignSummary>;
  delete(id: string): void;
}
