import { fr } from "../../../shared/i18n/fr.ts";
import { useProgressPresentation } from "../hooks/useProgressPresentation.ts";

export function AnalysisProgress({ saving = false }: { saving?: boolean }) {
  const { container, seconds } = useProgressPresentation();

  return (
    <div
      ref={container}
      tabIndex={-1}
      aria-label={fr.progressTitle}
      className="my-4 flex min-h-80 flex-col items-center justify-center gap-5 rounded-lg border-2 border-primary bg-accent p-6 text-center outline-none sm:p-10"
    >
      <span
        aria-hidden="true"
        className="size-14 rounded-full border-4 border-primary border-r-transparent motion-safe:animate-spin"
      />
      <div role="status" aria-live="polite">
        <h3 className="text-2xl font-bold text-foreground">
          {fr.progressTitle}
        </h3>
        <p className="mt-3 font-semibold text-primary">
          {saving ? fr.progressSaving : fr.progressComparing}
        </p>
      </div>
      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
        {fr.progressExplanation}
      </p>
      <p className="text-sm tabular-nums text-muted-foreground">
        {fr.progressElapsed} : {seconds} s
      </p>
      <p className="text-xs text-muted-foreground">{fr.progressWaiting}</p>
    </div>
  );
}
