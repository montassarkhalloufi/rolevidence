import { TITLE_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { Alert } from "../../shared/ui/alert.tsx";
import type { useCaseFileEditor } from "./useCaseFileEditor.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";
import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";
import { Card } from "../../shared/ui/card.tsx";
import { Input } from "../../shared/ui/input.tsx";
import { Button } from "../../shared/ui/button.tsx";
import { NativeSelect } from "../../shared/ui/native-select.tsx";
import { ProviderSelect } from "./ProviderSelect.tsx";

export function CaseFileSettings({
  editor,
  change,
  busy,
  bootstrap,
}: {
  editor: ReturnType<typeof useCaseFileEditor>;
  change: (value: ReturnType<typeof useCaseFileEditor>["draft"]) => void;
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
            maxLength={TITLE_MAX_CHARACTERS}
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
