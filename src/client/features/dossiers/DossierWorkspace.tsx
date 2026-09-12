import { CampaignCreate } from "../workflows/CampaignCreate.tsx";
import { TrackingForm } from "../workflows/TrackingForm.tsx";
import { JobProgress } from "../workflows/JobProgress.tsx";
import { useSavedAnalysis } from "./useSavedAnalysis.ts";
import { fr } from "../../shared/i18n/fr.ts";
import { WorkflowStatus } from "./WorkflowStatus.tsx";
import { Alert } from "../../shared/ui/alert.tsx";
import { ContextPanel } from "../analysis/components/ContextPanel.tsx";
import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { dossierApi } from "./api.ts";
import { useDossierEditor } from "./useDossierEditor.ts";
import { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import type { DossierData } from "../../../shared/dossiers.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { PageLayout } from "../../app/PageLayout.tsx";
import { Card } from "../../shared/ui/card.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";
import { Input } from "../../shared/ui/input.tsx";
import { Button } from "../../shared/ui/button.tsx";
import { NativeSelect } from "../../shared/ui/native-select.tsx";
import { ProviderSelect } from "./ProviderSelect.tsx";
import { OfferImport } from "./OfferImport.tsx";
import { DossierHistory } from "./DossierHistory.tsx";
import { DocumentEditor } from "../documents/components/DocumentEditor.tsx";
import { PreferencesForm } from "../preferences/components/PreferencesForm.tsx";
import { ResultsPanel } from "../analysis/components/ResultsPanel.tsx";
import { AnalyzeButton } from "../analysis/components/AnalyzeButton.tsx";

export function DossierWorkspace({
  id,
  bootstrap,
  onBack,
  onCampaign,
}: {
  id: string;
  bootstrap: BootstrapData;
  onBack: () => void;
  onCampaign: (id: string) => void;
}) {
  const dossier = useQuery({
    queryKey: ["dossier", id],
    queryFn: ({ signal }) => dossierApi.get(id, signal),
  });

  if (dossier.isPending) {
    return <p role="status">{t.loading}</p>;
  }

  if (dossier.error) {
    return (
      <div role="alert">
        {dossier.error.message}
        <Button onClick={onBack}>{t.back}</Button>
      </div>
    );
  }

  return (
    <DossierEditor
      initial={dossier.data}
      bootstrap={bootstrap}
      onBack={onBack}
      onCampaign={onCampaign}
    />
  );
}

function DossierEditor({
  initial,
  bootstrap,
  onBack,
  onCampaign,
}: {
  initial: DossierData;
  bootstrap: BootstrapData;
  onBack: () => void;
  onCampaign: (id: string) => void;
}) {
  const editor = useDossierEditor(initial);

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
      <DossierNavigation
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
        <DossierPreparation
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
        <DossierTracking
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
        <DossierFooter
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

function DossierSettings({
  editor,
  change,
  busy,
  bootstrap,
}: {
  editor: ReturnType<typeof useDossierEditor>;
  change: (value: ReturnType<typeof useDossierEditor>["draft"]) => void;
  busy: boolean;
  bootstrap: BootstrapData;
}) {
  const { draft, dirty, save } = editor;

  return (
    <Card>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          {t.name}
          <Input
            value={draft.title}
            maxLength={120}
            onChange={(event) =>
              change({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label className="space-y-2">
          {t.purpose}
          <NativeSelect
            value={draft.purpose}
            onChange={(event) =>
              change({
                ...draft,
                purpose:
                  event.target.value === "recruiting"
                    ? "recruiting"
                    : "job_search",
              })
            }
          >
            <option value="job_search">{t.jobSearch}</option>
            <option value="recruiting">{t.recruiting}</option>
          </NativeSelect>
        </label>
        <ProviderSelect
          options={bootstrap.providers ?? []}
          value={draft.selection}
          onChange={(selection) => change({ ...draft, selection })}
          disabled={busy}
        />
        <div className="self-end">
          <Button
            disabled={!dirty || !draft.title.trim()}
            onClick={() => save.mutate()}
          >
            {t.save}
          </Button>
        </div>
      </fieldset>
      {save.error && (
        <Alert>
          <p>{save.error.message}</p>
        </Alert>
      )}
    </Card>
  );
}

type DossierFormProps = {
  editor: ReturnType<typeof useDossierEditor>;
  analysis: ReturnType<typeof useAnalysis>;
  busy: boolean;
  configured: boolean;
  importing: boolean;
  setImporting: (value: boolean) => void;
  change: (value: ReturnType<typeof useDossierEditor>["draft"]) => void;
  analyze: () => Promise<void>;
  bootstrap: BootstrapData;
};

function DossierForm({
  editor,
  analysis,
  busy,
  configured,
  importing,
  setImporting,
  change,
  analyze,
  bootstrap,
}: DossierFormProps) {
  const { draft, dirty } = editor;

  const disabled =
    busy ||
    !draft.title.trim() ||
    !configured ||
    !draft.documents.profile.trim() ||
    !draft.documents.job.trim();

  return (
    <Card>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) {
            void analyze();
          }
        }}
      >
        <DocumentEditor
          documents={draft.documents}
          disabled={busy}
          onImporting={setImporting}
          onChange={(documents) =>
            change({
              ...draft,
              documents: {
                ...documents,
                reviewedJobQuotes: draft.documents.reviewedJobQuotes,
                clarifications: draft.documents.clarifications,
                preferences:
                  documents.preferences ?? draft.documents.preferences,
              },
            })
          }
          onReset={() =>
            change({
              ...draft,
              documents: {
                ...bootstrap.documents,
                reviewedJobQuotes: draft.documents.reviewedJobQuotes,
                clarifications: draft.documents.clarifications,
                preferences: draft.documents.preferences,
              },
            })
          }
        />
        <PreferencesForm
          value={draft.documents.preferences}
          disabled={busy}
          onChange={(preferences) =>
            change({
              ...draft,
              documents: { ...draft.documents, preferences },
            })
          }
        />
        <Clarifications draft={draft} change={change} busy={busy} />
        {dirty && (
          <p className="text-sm text-muted-foreground">{t.saveFirst}</p>
        )}
        <AnalyzeButton
          activity={importing ? "importing" : analysis.state.status}
          disabled={disabled}
          saving={editor.save.isPending}
          saveRequired={dirty}
        />
        {analysis.state.status === "error" && (
          <div>
            <Button variant="outline" onClick={analysis.clear}>
              {t.newRequest}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function providerAvailable(
  bootstrap: BootstrapData,
  selection: DossierData["selection"],
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

function DossierContext({
  draft,
}: {
  draft: ReturnType<typeof useDossierEditor>["draft"];
}) {
  return (
    <ContextPanel
      key={JSON.stringify({
        documents: draft.documents,
        selection: draft.selection,
      })}
      documents={{ ...draft.documents, selection: draft.selection }}
    />
  );
}

function DossierNavigation({
  busy,
  dirty,
  onBack,
}: {
  busy: boolean;
  dirty: boolean;
  onBack: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          if (!dirty || window.confirm(t.leave)) {
            onBack();
          }
        }}
      >
        {t.back}
      </Button>
      <span role="status" className="text-sm">
        {dirty ? t.unsaved : t.saved}
      </span>
    </div>
  );
}

function WorkspaceResults({
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

function DocumentPreparation({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={!collapsed}
      className="rounded-md border border-border bg-card p-4"
    >
      <summary className="font-semibold text-primary">
        {fr.editDocuments}
      </summary>
      <div className="mt-5 space-y-5">{children}</div>
    </details>
  );
}

function Clarifications({
  draft,
  change,
  busy,
}: {
  draft: ReturnType<typeof useDossierEditor>["draft"];
  change: DossierFormProps["change"];
  busy: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <strong>{fr.clarificationsTitle}</strong>
      <p className="text-muted-foreground">{fr.clarificationsHelp}</p>
      <Textarea
        rows={5}
        maxLength={16000}
        disabled={busy}
        value={draft.documents.clarifications ?? ""}
        onChange={(event) =>
          change({
            ...draft,
            documents: {
              ...draft.documents,
              clarifications: event.target.value,
            },
          })
        }
      />
    </label>
  );
}

function includeQuote(
  draft: ReturnType<typeof useDossierEditor>["draft"],
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
  draft: ReturnType<typeof useDossierEditor>["draft"],
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

function DossierTracking({
  enabled,
  editor,
  busy,
}: {
  enabled: boolean;
  editor: ReturnType<typeof useDossierEditor>;
  busy: boolean;
}) {
  return enabled ? (
    <TrackingForm
      error={editor.save.error?.message}
      onSave={() => editor.save.mutate()}
      canSave={editor.dirty && Boolean(editor.draft.title.trim())}
      value={editor.draft.tracking}
      disabled={busy}
      onChange={(tracking) => editor.setDraft({ ...editor.draft, tracking })}
    />
  ) : null;
}

function DossierFooter({
  editor,
  generation,
  enabled,
  busy,
  onCampaign,
}: {
  editor: ReturnType<typeof useDossierEditor>;
  generation: string;
  enabled: boolean;
  busy: boolean;
  onCampaign: (id: string) => void;
}) {
  return (
    <>
      <DossierContext draft={editor.draft} />
      <DossierHistory id={editor.saved.id} generation={generation} />
      {enabled && (
        <CampaignCreate
          base={editor.saved}
          disabled={busy || editor.dirty}
          onOpen={onCampaign}
        />
      )}
    </>
  );
}

function DossierPreparation(props: DossierFormProps & { collapsed: boolean }) {
  const {
    editor,
    change,
    busy,
    bootstrap,
    setImporting,
    configured,
    collapsed,
  } = props;

  const { draft } = editor;

  return (
    <DocumentPreparation collapsed={collapsed}>
      <DossierSettings
        editor={editor}
        change={change}
        busy={busy}
        bootstrap={bootstrap}
      />
      <OfferImport
        onBusy={setImporting}
        selection={draft.selection}
        disabled={busy || !configured}
        onAdopt={(offerSource, text) =>
          change({
            ...draft,
            offerSource,
            documents: { ...draft.documents, job: text },
          })
        }
      />
      <DossierForm {...props} />
    </DocumentPreparation>
  );
}
