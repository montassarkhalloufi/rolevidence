import { ANALYSIS_HISTORY_PAGE_SIZE } from "../../../shared/limits.ts";
import { z } from "zod";
import { request, jsonRequest } from "../../shared/api/client.ts";
import {
  Backup,
  CaseFile,
  CaseFilePage,
  AnalysisPage,
  OfferSource,
} from "../../../shared/case-files.ts";
import type { CaseFileDraftData } from "../../../shared/case-files.ts";
import type { ModelSelectionData } from "../../../shared/providers.ts";

const root = "/api/v1/dossiers";

export const caseFileApi = {
  backup: async (id: string) =>
    Backup.parse(await request(`${root}/${id}/backup`)),
  restore: async (backup: unknown) =>
    CaseFile.parse(
      await request(`${root}/restore`, jsonRequest(Backup.parse(backup))),
    ),
  list: async (q: string, offset: number, signal: AbortSignal) =>
    CaseFilePage.parse(
      await request(
        `${root}?${new URLSearchParams({ q, offset: String(offset) })}`,
        { signal },
      ),
    ),
  get: async (id: string, signal: AbortSignal) =>
    CaseFile.parse(await request(`${root}/${id}`, { signal })),
  save: async (id: string, draft: CaseFileDraftData, revision: number) =>
    CaseFile.parse(
      await request(`${root}/${id}`, {
        ...jsonRequest({ draft, revision }),
        method: "PUT",
      }),
    ),
  delete: async (id: string, revision: number) =>
    request(`${root}/${id}`, {
      ...jsonRequest({ revision }),
      method: "DELETE",
    }),
  history: async (id: string, offset: number, signal: AbortSignal) =>
    AnalysisPage.parse(
      await request(
        `${root}/${id}/analyses?offset=${offset}&limit=${ANALYSIS_HISTORY_PAGE_SIZE}`,
        {
          signal,
        },
      ),
    ),
  importOffer: async (
    url: string,
    selection: ModelSelectionData,
    key: string,
  ) =>
    z.object({ source: OfferSource, rejectedFields: z.number() }).parse(
      await request("/api/v1/offer-imports", {
        ...jsonRequest({ url, selection }),
        headers: { ...jsonRequest({}).headers, "Idempotency-Key": key },
      }),
    ),
};
