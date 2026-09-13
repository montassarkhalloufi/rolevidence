import { request, jsonRequest } from "../../shared/api/client.ts";
import {
  Campaign,
  CampaignPage,
  AnalysisJob,
} from "../../../shared/workflows.ts";
import type { CampaignInputData } from "../../../shared/workflows.ts";

export const workflowApi = {
  campaigns: async (offset: number, signal: AbortSignal) =>
    CampaignPage.parse(
      await request(`/api/v1/campaigns?offset=${offset}`, { signal }),
    ),
  campaign: async (id: string, signal: AbortSignal) =>
    Campaign.parse(await request(`/api/v1/campaigns/${id}`, { signal })),
  create: async (id: string, input: CampaignInputData) =>
    Campaign.parse(
      await request(`/api/v1/campaigns/${id}`, {
        ...jsonRequest(input),
        method: "PUT",
      }),
    ),
  remove: (id: string) =>
    request(`/api/v1/campaigns/${id}`, {
      ...jsonRequest({}),
      method: "DELETE",
    }),
  latest: async (id: string, signal: AbortSignal) =>
    AnalysisJob.nullable().parse(
      await request(`/api/v1/dossiers/${id}/latest-job`, { signal }),
    ),
  job: async (id: string, signal: AbortSignal) =>
    AnalysisJob.parse(await request(`/api/v1/analysis-jobs/${id}`, { signal })),
  start: async (id: string, caseFileId: string, revision: number) =>
    AnalysisJob.parse(
      await request(`/api/v1/analysis-jobs/${id}`, {
        ...jsonRequest({ dossierId: caseFileId, revision }),
        method: "PUT",
      }),
    ),
  cancel: async (id: string, attempt: number) =>
    AnalysisJob.parse(
      await request(
        `/api/v1/analysis-jobs/${id}/cancel`,
        jsonRequest({ attempt }),
      ),
    ),
  resume: async (id: string, attempt: number) =>
    AnalysisJob.parse(
      await request(
        `/api/v1/analysis-jobs/${id}/resume`,
        jsonRequest({ attempt }),
      ),
    ),
};
