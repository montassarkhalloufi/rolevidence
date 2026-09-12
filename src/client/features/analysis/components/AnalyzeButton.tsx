import { Button } from "../../../shared/ui/button.tsx";
import { fr } from "../../../shared/i18n/fr.ts";

type AnalyzeButtonProps = {
  activity: "idle" | "loading" | "success" | "error" | "importing";
  disabled: boolean;
  saveRequired?: boolean;
  saving?: boolean;
};

const labels = {
  idle: fr.analyze,
  loading: fr.analyzing,
  success: fr.analyze,
  error: fr.analyze,
  importing: fr.importing,
};

export function AnalyzeButton({
  activity,
  disabled,
  saveRequired = false,
  saving = false,
}: AnalyzeButtonProps) {
  const busy = saving || activity === "loading" || activity === "importing";

  return (
    <Button
      className="w-full"
      size="lg"
      aria-busy={busy}
      disabled={disabled}
      type="submit"
    >
      <span aria-hidden="true">{busy ? "◌" : "✧"}</span>
      {saving ? fr.saving : actionLabel(activity, saveRequired)}
      <span aria-hidden="true">→</span>
    </Button>
  );
}

function actionLabel(
  activity: AnalyzeButtonProps["activity"],
  saveRequired: boolean,
) {
  if (saveRequired && activity !== "loading" && activity !== "importing") {
    return fr.saveAndAnalyze;
  }

  return labels[activity];
}
