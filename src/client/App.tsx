import { Alert } from "./shared/ui/alert.tsx";
import { AnalyzeButton } from "./features/analysis/components/AnalyzeButton.tsx";
import { PageLayout } from "./app/PageLayout.tsx";
import { fr } from "./shared/i18n/fr.ts";
import { Card } from "./shared/ui/card.tsx";
import { Button } from "./shared/ui/button.tsx";
import { useState } from "react";
import { useBootstrap } from "./app/useBootstrap.ts";
import { useAnalysis } from "./features/analysis/hooks/useAnalysis.ts";
import { PreferencesForm } from "./features/preferences/components/PreferencesForm.tsx";
import { emptyPreferences } from "../shared/analysis.ts";
import { DocumentEditor } from "./features/documents/components/DocumentEditor.tsx";
import { ResultsPanel } from "./features/analysis/components/ResultsPanel.tsx";
import { ContextPanel } from "./features/analysis/components/ContextPanel.tsx";
import type { BootstrapData, DocumentsInput } from "../shared/analysis.ts";

export function App() {
  const bootstrap = useBootstrap();

  if (bootstrap.isPending) {
    return <p role="status">{fr.loadingApp}</p>;
  }

  if (bootstrap.isError) {
    return (
      <div role="alert">
        {fr.connectionFailed}
        {bootstrap.error.message}{" "}
        <Button onClick={() => void bootstrap.refetch()}>{fr.retry}</Button>
      </div>
    );
  }

  return <AnalysisWorkbench bootstrap={bootstrap.data} />;
}

function AnalysisWorkbench({ bootstrap }: { bootstrap: BootstrapData }) {
  const [documents, setDocuments] = useState<DocumentsInput>(
    bootstrap.documents,
  );

  const [revision, setRevision] = useState(0);

  const [importing, setImporting] = useState(false);

  const { state, run, clear } = useAnalysis();

  const busy = state.status === "loading" || importing;

  const preferences = documents.preferences ?? emptyPreferences;

  function update(value: DocumentsInput) {
    setDocuments(value);
    clear();
    setRevision((value) => value + 1);
  }

  return (
    <PageLayout model={bootstrap.model}>
      {
        <>
          {!bootstrap.configured && (
            <Alert asChild>
              <p role="alert">{fr.missingKey}</p>
            </Alert>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card asChild>
              <form
                className="min-w-0 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy) {
                    void run(documents);
                  }
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-editorial text-2xl">
                    <span className="mr-2 text-muted-foreground">01 /</span>
                    {fr.documentsTitle}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {fr.yourTurn}
                  </span>
                </div>
                <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
                  {fr.documentsDescription}
                </p>
                <DocumentEditor
                  documents={documents}
                  disabled={busy}
                  onChange={update}
                  onReset={() =>
                    update({
                      ...bootstrap.documents,
                      preferences: preferences,
                    })
                  }
                  onImporting={setImporting}
                />
                <PreferencesForm
                  value={preferences}
                  disabled={busy}
                  onChange={(preferences) =>
                    update({ ...documents, preferences })
                  }
                />
                <AnalyzeButton
                  activity={importing ? "importing" : state.status}
                  disabled={
                    busy ||
                    !bootstrap.configured ||
                    !documents.profile.trim() ||
                    !documents.job.trim()
                  }
                />
                <p className="my-3 text-center text-xs leading-relaxed text-muted-foreground">
                  {fr.privacy}
                  <br />
                  {fr.removeContacts}
                </p>
                {state.status === "error" && (
                  <AnalysisError message={state.message} onReset={clear} />
                )}
              </form>
            </Card>
            <ResultsPanel
              loading={state.status === "loading"}
              result={state.status === "success" ? state.result : null}
            />
          </div>
          <ContextPanel key={revision} documents={documents} />
        </>
      }
    </PageLayout>
  );
}

function AnalysisError({
  message,
  onReset,
}: {
  message: string;
  onReset: () => void;
}) {
  return (
    <Alert asChild>
      <div role="alert">
        <p>{message}</p>
        <Button variant="outline" onClick={onReset}>
          {fr.newAttempt}
        </Button>
        <p>{fr.newAttemptHelp}</p>
      </div>
    </Alert>
  );
}
