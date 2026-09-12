import { useJobFocus } from "./useJobFocus.ts";
import type { useAnalysis } from "../analysis/hooks/useAnalysis.ts";
import { workflowsFr as t } from "../../shared/i18n/workflows-fr.ts";
import { Button } from "../../shared/ui/button.tsx";

export function JobProgress({
  analysis,
}: {
  analysis: ReturnType<typeof useAnalysis>;
}) {
  const job = analysis.job;

  const container = useJobFocus(job?.id, job?.status === "running");

  if (!job) {
    return null;
  }

  const running = job.status === "running";

  return (
    <section
      ref={container}
      tabIndex={-1}
      aria-label={t.progress}
      className="rounded-md border-2 border-primary bg-accent p-5 space-y-3"
    >
      {running && (
        <span
          aria-hidden="true"
          className="block size-10 rounded-full border-4 border-primary border-r-transparent motion-safe:animate-spin"
        />
      )}
      <p role="status" className="font-semibold">
        {job.status === "running"
          ? t.stages[job.progress.stage]
          : t[job.status]}
      </p>
      <p>
        {t.completedSteps} : {job.progress.completed} / {job.progress.total} ·{" "}
        {t.attempt} {job.attempt}
      </p>
      {running && (
        <>
          <progress
            aria-label={t.completedSteps}
            max={Math.max(1, job.progress.total)}
            value={job.progress.completed}
            className="w-full"
          />
          <p className="text-sm">{t.cancelHelp}</p>
          <Button
            variant="outline"
            disabled={analysis.actionPending}
            onClick={analysis.cancel}
          >
            {t.cancel}
          </Button>
        </>
      )}
      {analysis.actionError && <p role="alert">{analysis.actionError}</p>}
      {!running && job.status !== "completed" && (
        <>
          <p className="text-sm">{t.resumeHelp}</p>
          <Button disabled={analysis.actionPending} onClick={analysis.resume}>
            {t.resume}
          </Button>
        </>
      )}
    </section>
  );
}
