import { DOCUMENT_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { fr } from "../../shared/i18n/fr.ts";
import type { useCaseFileEditor } from "./useCaseFileEditor.ts";
import type { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Card } from "../../shared/ui/card.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";
import { Button } from "../../shared/ui/button.tsx";
import { DocumentEditor } from "../documents/components/DocumentEditor.tsx";
import { PreferencesForm } from "../preferences/components/PreferencesForm.tsx";
import { AnalyzeButton } from "../analysis/components/AnalyzeButton.tsx";

export type CaseFileFormProps = {
  editor: ReturnType<typeof useCaseFileEditor>;
  analysis: ReturnType<typeof useAnalysis>;
  busy: boolean;
  configured: boolean;
  importing: boolean;
  setImporting: (value: boolean) => void;
  change: (value: ReturnType<typeof useCaseFileEditor>["draft"]) => void;
  analyze: () => Promise<void>;
  bootstrap: BootstrapData;
};

export function CaseFileForm({
  editor,
  analysis,
  busy,
  configured,
  importing,
  setImporting,
  change,
  analyze,
  bootstrap,
}: CaseFileFormProps) {
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

function Clarifications({
  draft,
  change,
  busy,
}: {
  draft: ReturnType<typeof useCaseFileEditor>["draft"];
  change: CaseFileFormProps["change"];
  busy: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <strong>{fr.clarificationsTitle}</strong>
      <p className="text-muted-foreground">{fr.clarificationsHelp}</p>
      <Textarea
        rows={5}
        maxLength={DOCUMENT_MAX_CHARACTERS}
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
