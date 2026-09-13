import { JobProgress } from "../workflows/JobProgress.tsx";
import { useSavedAnalysis } from "./useSavedAnalysis.ts";
import { WorkflowStatus } from "./WorkflowStatus.tsx";
import { useState } from "react";
import { useCaseFileEditor } from "./useCaseFileEditor.ts";
import { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import type { CaseFileData } from "../../../shared/case-files.ts";
import { PageLayout } from "../../app/PageLayout.tsx";
import { CaseFileNavigation } from "./CaseFileNavigation.tsx";
import { CaseFilePreparation } from "./CaseFilePreparation.tsx";
import { CaseFileTracking } from "./CaseFileTracking.tsx";
import { WorkspaceResults } from "./WorkspaceResults.tsx";
import { CaseFileFooter } from "./CaseFileFooter.tsx";

export function CaseFileEditor({
  initial,
  bootstrap,
  onBack,
  onCampaign,
}: {
  initial: CaseFileData;
  bootstrap: BootstrapData;
  onBack: () => void;
  onCampaign: (id: string) => void;
}) {
  const editor = useCaseFileEditor(initial);

  const analysis = useAnalysis(
    bootstrap.workflowsEnabled ? initial.id : undefined,
    editor.saved.revision,
  );

  const { submitting, generation, analyze } = useSavedAnalysis(
    editor,
    analysis,
  );

  const [importing, setImporting] = useState(false);

  const { draft, dirty, save } = editor;

  const busy =
    analysis.actionPending ||
    submitting ||
    analysis.state.status === "loading" ||
    save.isPending ||
    importing;

  const configured = providerAvailable(bootstrap, draft.selection);

  function change(value: typeof draft) {
    editor.setDraft(value);
    analysis.clear();
  }

  return (
    <PageLayout model={draft.selection.model} title={draft.title}>
      <CaseFileNavigation
        busy={busy && !analysis.job}
        dirty={dirty}
        onBack={onBack}
      />
      <div className="space-y-6">
        <WorkflowStatus
          saving={save.isPending}
          loading={analysis.state.status === "loading"}
          importing={importing}
          complete={analysis.state.status === "success"}
        />
        <CaseFilePreparation
          editor={editor}
          analysis={analysis}
          busy={busy}
          configured={configured}
          importing={importing}
          setImporting={setImporting}
          change={change}
          analyze={analyze}
          bootstrap={bootstrap}
          collapsed={
            submitting ||
            analysis.state.status === "loading" ||
            analysis.state.status === "success"
          }
        />
        <CaseFileTracking
          enabled={Boolean(bootstrap.workflowsEnabled)}
          editor={editor}
          busy={busy}
        />
        <JobProgress analysis={analysis} />
        <WorkspaceResults
          analysis={analysis}
          submitting={submitting}
          saving={save.isPending}
          onInclude={(quote) => change(includeQuote(draft, quote))}
          onClarify={(text) => change(appendClarification(draft, text))}
        />
        <CaseFileFooter
          editor={editor}
          generation={`${generation}-${analysis.state.status}`}
          enabled={Boolean(bootstrap.workflowsEnabled)}
          busy={busy}
          onCampaign={onCampaign}
        />
      </div>
    </PageLayout>
  );
}

function providerAvailable(
  bootstrap: BootstrapData,
  selection: CaseFileData["selection"],
) {
  return (
    bootstrap.providers?.some(
      (option) =>
        option.provider === selection.provider &&
        option.model === selection.model &&
        option.configured,
    ) ?? false
  );
}

function includeQuote(
  draft: ReturnType<typeof useCaseFileEditor>["draft"],
  quote: string,
) {
  return {
    ...draft,
    documents: {
      ...draft.documents,
      reviewedJobQuotes: [
        ...new Set([...(draft.documents.reviewedJobQuotes ?? []), quote]),
      ],
    },
  };
}

function appendClarification(
  draft: ReturnType<typeof useCaseFileEditor>["draft"],
  text: string,
) {
  return {
    ...draft,
    documents: {
      ...draft.documents,
      clarifications: [draft.documents.clarifications, text]
        .filter(Boolean)
        .join("\n"),
    },
  };
}
