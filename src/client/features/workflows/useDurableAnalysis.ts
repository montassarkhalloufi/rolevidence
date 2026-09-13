import { JOB_POLL_INTERVAL_MS } from "../../../shared/limits.ts";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowApi } from "./api.ts";
import type { AnalysisInputData } from "../../../shared/analysis.ts";
import type { AnalysisJobData } from "../../../shared/workflows.ts";

export function useDurableAnalysis(caseFileId?: string, revision?: number) {
  const client = useQueryClient();

  const [hidden, setHidden] = useState<string | null>(null);

  const requestKey = useRef<{ id: string; identity: string } | null>(null);

  const queryKey = ["latest-job", caseFileId];

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => workflowApi.latest(caseFileId ?? "", signal),
    enabled: Boolean(caseFileId),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? JOB_POLL_INTERVAL_MS : false,
  });

  function received(job: AnalysisJobData) {
    setHidden(null);
    client.setQueryData(queryKey, job);
  }

  const start = useMutation({
    mutationFn: (input: AnalysisInputData) => {
      const identity = JSON.stringify({
        dossierId: input.dossierId,
        revision: input.dossierRevision,
      });

      if (requestKey.current?.identity !== identity) {
        requestKey.current = { id: crypto.randomUUID(), identity };
      }

      return workflowApi.start(
        requestKey.current.id,
        input.dossierId ?? "",
        input.dossierRevision ?? 0,
      );
    },
    onSuccess: received,
  });

  const resume = useMutation({
    mutationFn: (job: AnalysisJobData) =>
      workflowApi.resume(job.id, job.attempt),
    onSuccess: received,
  });

  const cancel = useMutation({
    mutationFn: (job: AnalysisJobData) =>
      workflowApi.cancel(job.id, job.attempt),
    onSuccess: received,
  });

  const job =
    query.data &&
    query.data.id !== hidden &&
    (query.data.status !== "completed" || query.data.revision === revision)
      ? query.data
      : null;

  const error = start.error ?? resume.error ?? cancel.error ?? query.error;

  const state = durableState(job, start.isPending, error);

  return {
    state,
    actionError: error?.message,
    job,
    actionPending: resume.isPending || cancel.isPending,
    resume: () => {
      if (job) {
        resume.mutate(job);
      }
    },
    cancel: () => {
      if (job) {
        cancel.mutate(job);
      }
    },
    run: async (input: AnalysisInputData) => {
      try {
        await start.mutateAsync(input);
      } catch {
        /* Safe error is rendered from the mutation. */
      }
    },
    clear: () => {
      setHidden(query.data?.id ?? null);
      requestKey.current = null;
      start.reset();
      resume.reset();
      cancel.reset();
    },
  };
}

function durableState(
  job: AnalysisJobData | null,
  starting: boolean,
  error: Error | null,
) {
  if (starting || job?.status === "running") {
    return { status: "loading" as const };
  }

  if (error) {
    return { status: "error" as const, message: error.message };
  }

  if (job?.status === "completed" && job.result) {
    return { status: "success" as const, result: job.result.result };
  }

  if (job?.error) {
    return { status: "error" as const, message: job.error };
  }

  return { status: "idle" as const };
}
