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

export type CaseFileDraft = {
  tracking?:
    | {
        status: "preparing" | "applied" | "interview" | "offer" | "closed";
        notes: string;
        preparation: string;
        interview: string;
      }
    | undefined;
  title: string;
  purpose: "job_search" | "recruiting";
  documents: DocumentsInput & {
    preferences: NonNullable<DocumentsInput["preferences"]>;
  };
  selection: Selection;
  offerSource: OfferProvenance | null;
};

export type CaseFile = CaseFileDraft & {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type SavedAnalysis = {
  id: string;
  dossierId: string;
  createdAt: string;
  snapshot: CaseFile;
  result: AnalysisOutput;
};

export type CaseFileSummary = Pick<
  CaseFile,
  "id" | "title" | "purpose" | "revision" | "createdAt" | "updatedAt"
>;

export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

export type CaseFileBackup = {
  format: "rolevidence-backup-v1";
  dossier: CaseFile;
  analyses: SavedAnalysis[];
};

export interface CaseFileRepository {
  backup(id: string): CaseFileBackup;
  restore(backup: CaseFileBackup): CaseFile;
  list(query: string, offset: number, limit: number): Page<CaseFileSummary>;
  get(id: string): CaseFile;
  save(id: string, draft: CaseFileDraft, revision: number): CaseFile;
  delete(id: string, revision: number): void;
  analyses(id: string, offset: number, limit: number): Page<SavedAnalysis>;
  append(
    snapshot: CaseFile,
    result: AnalysisOutput,
    requestKey: string,
  ): SavedAnalysis;
}
