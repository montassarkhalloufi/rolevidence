import { fr } from "../../shared/i18n/fr.ts";
import type { ReactNode } from "react";
import { OfferImport } from "./OfferImport.tsx";
import { CaseFileSettings } from "./CaseFileSettings.tsx";
import { CaseFileForm } from "./CaseFileForm.tsx";
import type { CaseFileFormProps } from "./CaseFileForm.tsx";

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

export function CaseFilePreparation(
  props: CaseFileFormProps & { collapsed: boolean },
) {
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
      <CaseFileSettings
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
      <CaseFileForm {...props} />
    </DocumentPreparation>
  );
}
