import type { DocumentsInput } from "../domain/models.ts";
import type { AnalysisOutput } from "./analyze.ts";

export type Selection = { provider: "openai" | "anthropic"; model: string };

export type OfferProvenance = {
  url: string;
  retrievedAt: string;
  text: string;
  fields: {
    name:
      | "title"
      | "company"
      | "location"
      | "responsibilities"
      | "skills"
      | "experience"
      | "requirements"
      | "contract"
      | "salary"
      | "workMode";
    value: string;
    quote: string;
  }[];
};

export type DossierDraft = {
  title: string;
  purpose: "job_search" | "recruiting";
  documents: DocumentsInput & {
    preferences: NonNullable<DocumentsInput["preferences"]>;
  };
  selection: Selection;
  offerSource: OfferProvenance | null;
};

export type Dossier = DossierDraft & {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type SavedAnalysis = {
  id: string;
  dossierId: string;
  createdAt: string;
  snapshot: Dossier;
  result: AnalysisOutput;
};

export type DossierSummary = Pick<
  Dossier,
  "id" | "title" | "purpose" | "revision" | "createdAt" | "updatedAt"
>;

export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

export type DossierBackup = {
  format: "rolevidence-backup-v1";
  dossier: Dossier;
  analyses: SavedAnalysis[];
};

export interface DossierRepository {
  backup(id: string): DossierBackup;
  restore(backup: DossierBackup): Dossier;
  list(query: string, offset: number, limit: number): Page<DossierSummary>;
  get(id: string): Dossier;
  save(id: string, draft: DossierDraft, revision: number): Dossier;
  delete(id: string, revision: number): void;
  analyses(id: string, offset: number, limit: number): Page<SavedAnalysis>;
  append(
    snapshot: Dossier,
    result: AnalysisOutput,
    requestKey: string,
  ): SavedAnalysis;
}
