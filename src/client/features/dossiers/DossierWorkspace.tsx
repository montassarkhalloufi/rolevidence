import { ContextPanel } from "../analysis/components/ContextPanel.tsx";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dossierApi } from "./api.ts";
import { useDossierEditor } from "./useDossierEditor.ts";
import { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import type { DossierData } from "../../../shared/dossiers.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { PageLayout } from "../../app/PageLayout.tsx";
import { Card } from "../../shared/ui/card.tsx";
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
}: {
  id: string;
  bootstrap: BootstrapData;
  onBack: () => void;
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
    />
  );
}

function DossierEditor({
  initial,
  bootstrap,
  onBack,
}: {
  initial: DossierData;
  bootstrap: BootstrapData;
  onBack: () => void;
}) {
  const editor = useDossierEditor(initial);

  const analysis = useAnalysis();

  const [importing, setImporting] = useState(false);

  const [generation, setGeneration] = useState(0);

  const { draft, saved, dirty, save } = editor;

  const busy =
    analysis.state.status === "loading" || save.isPending || importing;

  const configured = providerAvailable(bootstrap, draft.selection);

  function change(value: typeof draft) {
    editor.setDraft(value);
    analysis.clear();
  }

  async function analyze() {
    await analysis.run({
      ...draft.documents,
      selection: draft.selection,
      dossierId: saved.id,
      dossierRevision: saved.revision,
    });
    setGeneration((value) => value + 1);
  }

  return (
    <PageLayout model={draft.selection.model}>
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
      <div className="space-y-6">
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
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <DossierForm
            editor={editor}
            analysis={analysis}
            busy={busy}
            configured={configured}
            importing={importing}
            setImporting={setImporting}
            change={change}
            analyze={analyze}
            bootstrap={bootstrap}
          />
          <ResultsPanel
            loading={analysis.state.status === "loading"}
            result={
              analysis.state.status === "success" ? analysis.state.result : null
            }
          />
        </div>
        <ContextPanel
          key={JSON.stringify({
            documents: draft.documents,
            selection: draft.selection,
          })}
          documents={{ ...draft.documents, selection: draft.selection }}
        />
        <DossierHistory id={saved.id} generation={generation} />
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
      {save.error && <p role="alert">{save.error.message}</p>}
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
    dirty ||
    !configured ||
    !draft.documents.profile.trim() ||
    !draft.documents.job.trim();

  return (
    <Card>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !dirty && configured) {
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
        {dirty && (
          <p className="text-sm text-muted-foreground">{t.saveFirst}</p>
        )}
        <AnalyzeButton
          activity={importing ? "importing" : analysis.state.status}
          disabled={disabled}
        />
        {analysis.state.status === "error" && (
          <div role="alert">
            <p>{analysis.state.message}</p>
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
