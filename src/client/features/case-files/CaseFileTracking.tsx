import { TrackingForm } from "../workflows/TrackingForm.tsx";
import type { useCaseFileEditor } from "./useCaseFileEditor.ts";

export function CaseFileTracking({
  enabled,
  editor,
  busy,
}: {
  enabled: boolean;
  editor: ReturnType<typeof useCaseFileEditor>;
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
