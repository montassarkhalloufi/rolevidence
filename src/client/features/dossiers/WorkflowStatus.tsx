import { workspaceFr as t } from "../../shared/i18n/workspace-fr.ts";

export function WorkflowStatus({
  saving,
  loading,
  importing,
  complete,
}: {
  saving: boolean;
  loading: boolean;
  importing: boolean;
  complete: boolean;
}) {
  const active = saving || loading || importing;

  const preparationStep = loading ? 1 : 0;

  const currentStep = complete && !active ? 2 : preparationStep;

  const message = activityMessage({ saving, loading, importing, complete });

  return (
    <div className="space-y-3">
      <ol
        aria-label={t.workflow}
        className="flex flex-wrap gap-4 border-b border-border"
      >
        {[t.prepareStep, t.analyzeStep, t.reviewStep].map((label, index) => (
          <li
            key={label}
            aria-current={index === currentStep ? "step" : undefined}
            className={`border-b-2 px-2 py-3 text-sm font-semibold ${index === currentStep ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {active && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-md border border-info bg-info-background p-4 text-info"
        >
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
          />
          <div>
            <p className="font-semibold">{message}</p>
            {loading && <p className="text-sm">{t.progressHelp}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function activityMessage({
  saving,
  loading,
  importing,
  complete,
}: {
  saving: boolean;
  loading: boolean;
  importing: boolean;
  complete: boolean;
}) {
  if (saving) {
    return t.savingProgress;
  }

  if (loading) {
    return t.analysisProgress;
  }

  if (importing) {
    return t.importProgress;
  }

  return complete ? t.reviewStep : t.prepareStep;
}
