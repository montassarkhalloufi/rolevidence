import { CampaignCreate } from "../workflows/CampaignCreate.tsx";
import { ContextPanel } from "../analysis/components/ContextPanel.tsx";
import type { useCaseFileEditor } from "./useCaseFileEditor.ts";
import { CaseFileHistory } from "./CaseFileHistory.tsx";

function CaseFileContext({
  draft,
}: {
  draft: ReturnType<typeof useCaseFileEditor>["draft"];
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

export function CaseFileFooter({
  editor,
  generation,
  enabled,
  busy,
  onCampaign,
}: {
  editor: ReturnType<typeof useCaseFileEditor>;
  generation: string;
  enabled: boolean;
  busy: boolean;
  onCampaign: (id: string) => void;
}) {
  return (
    <>
      <CaseFileContext draft={editor.draft} />
      <CaseFileHistory id={editor.saved.id} generation={generation} />
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
