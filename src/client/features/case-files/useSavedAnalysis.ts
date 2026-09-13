import { useRef, useState } from "react";
import type { useCaseFileEditor } from "./useCaseFileEditor.ts";
import type { useAnalysis } from "../analysis/hooks/useAnalysis.ts";

export function useSavedAnalysis(
  editor: ReturnType<typeof useCaseFileEditor>,
  analysis: ReturnType<typeof useAnalysis>,
) {
  const [submitting, setSubmitting] = useState(false);

  const [generation, setGeneration] = useState(0);

  const pending = useRef(false);

  async function analyze() {
    if (pending.current) {
      return;
    }

    pending.current = true;
    setSubmitting(true);
    try {
      const current = editor.dirty
        ? await editor.save.mutateAsync()
        : editor.saved;

      await analysis.run({
        ...current.documents,
        selection: current.selection,
        dossierId: current.id,
        dossierRevision: current.revision,
      });
    } catch {
      // Save errors stay visible; no provider invocation follows a failed save.
    } finally {
      pending.current = false;
      setSubmitting(false);
      setGeneration((value) => value + 1);
    }
  }

  return { submitting, generation, analyze };
}
