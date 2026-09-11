import { Button } from "../../../shared/ui/button.tsx";
import { fr } from "../../../shared/i18n/fr.ts";

type AnalyzeButtonProps = {
  activity: "idle" | "loading" | "success" | "error" | "importing";
  disabled: boolean;
};

const labels = {
  idle: fr.analyze,
  loading: fr.analyzing,
  success: fr.analyze,
  error: fr.analyze,
  importing: fr.importing,
};

export function AnalyzeButton({ activity, disabled }: AnalyzeButtonProps) {
  const busy = activity === "loading" || activity === "importing";

  return (
    <Button
      className="w-full"
      size="lg"
      aria-busy={busy}
      disabled={disabled}
      type="submit"
    >
      <span aria-hidden="true">{busy ? "◌" : "✧"}</span>
      {labels[activity]}
      <span aria-hidden="true">→</span>
    </Button>
  );
}
