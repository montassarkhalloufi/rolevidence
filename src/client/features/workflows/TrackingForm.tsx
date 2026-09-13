import { Button } from "../../shared/ui/button.tsx";
import type { CaseFileDraftData } from "../../../shared/case-files.ts";
import {
  Tracking,
  TRACKING_MAX_CHARACTERS,
} from "../../../shared/workflows.ts";
import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { NativeSelect } from "../../shared/ui/native-select.tsx";
import { Textarea } from "../../shared/ui/textarea.tsx";

export function TrackingForm({
  value,
  onChange,
  disabled,
  onSave,
  canSave,
  error,
}: {
  value: CaseFileDraftData["tracking"];
  onChange: (value: NonNullable<CaseFileDraftData["tracking"]>) => void;
  disabled: boolean;
  onSave: () => void;
  canSave: boolean;
  error?: string | undefined;
}) {
  const tracking = value ?? {
    status: "preparing",
    notes: "",
    preparation: "",
    interview: "",
  };

  return (
    <details className="rounded-md border border-border bg-card p-4">
      <summary className="font-semibold">{t.tracking}</summary>
      <p className="my-3 text-sm text-muted-foreground">{t.trackingHelp}</p>
      <fieldset disabled={disabled} className="space-y-4">
        <label className="block">
          {t.status}
          <NativeSelect
            value={tracking.status}
            onChange={(event) =>
              onChange({
                ...tracking,
                status: Tracking.shape.status.parse(event.target.value),
              })
            }
          >
            {Object.entries(t.statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {(["notes", "preparation", "interview"] as const).map((field) => (
          <label key={field} className="block">
            {t[field]}
            <Textarea
              aria-label={t[field]}
              rows={4}
              maxLength={TRACKING_MAX_CHARACTERS}
              value={tracking[field]}
              onChange={(event) =>
                onChange({ ...tracking, [field]: event.target.value })
              }
            />
          </label>
        ))}
        <Button disabled={!canSave} onClick={onSave}>
          {t.saveTracking}
        </Button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
