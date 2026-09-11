import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AnalysisResponseData } from "../../../../shared/analysis.ts";
import { api } from "../../../shared/api/client.ts";
import type { DocumentsInput } from "../../../../shared/analysis.ts";

export function useAnalysis() {
  const request = useRef<{ payload: string; key: string } | null>(null);

  const pending = useRef(false);

  const mutation = useMutation({
    mutationFn: ({
      documents,
      key,
    }: {
      documents: DocumentsInput;
      key: string;
    }) => api.analyze(documents, key),
  });

  async function run(documents: DocumentsInput) {
    if (pending.current) {
      return;
    }

    const payload = JSON.stringify(documents);

    if (request.current?.payload !== payload) {
      request.current = { payload, key: crypto.randomUUID() };
    }

    pending.current = true;
    try {
      await mutation.mutateAsync({ documents, key: request.current.key });
    } catch {
      /* The mutation exposes the safe API error to the view. */
    } finally {
      pending.current = false;
    }
  }

  const state = analysisState(mutation);

  return {
    state,
    run,
    clear: () => {
      request.current = null;
      mutation.reset();
    },
  };
}

function analysisState(
  mutation: UseMutationResult<
    AnalysisResponseData,
    Error,
    { documents: DocumentsInput; key: string }
  >,
) {
  if (mutation.isPending) {
    return { status: "loading" as const };
  }

  if (mutation.isError) {
    return { status: "error" as const, message: mutation.error.message };
  }

  if (mutation.isSuccess) {
    return { status: "success" as const, result: mutation.data };
  }

  return { status: "idle" as const };
}
