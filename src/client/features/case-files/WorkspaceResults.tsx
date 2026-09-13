import type { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import { ResultsPanel } from "../analysis/components/ResultsPanel.tsx";

export function WorkspaceResults({
  analysis,
  submitting,
  saving,
  onClarify,
  onInclude,
}: {
  analysis: ReturnType<typeof useAnalysis>;
  submitting: boolean;
  saving: boolean;
  onClarify: (text: string) => void;
  onInclude: (quote: string) => void;
}) {
  if (analysis.job?.status === "running") {
    return null;
  }

  return (
    <ResultsPanel
      loading={submitting || analysis.state.status === "loading"}
      saving={saving}
      onClarify={onClarify}
      onInclude={onInclude}
      error={
        analysis.state.status === "error" ? analysis.state.message : undefined
      }
      result={
        analysis.state.status === "success" ? analysis.state.result : null
      }
    />
  );
}
