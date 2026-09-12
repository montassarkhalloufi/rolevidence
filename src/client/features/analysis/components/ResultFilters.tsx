import { Button } from "../../../shared/ui/button.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import type { AnalysisResponseData } from "../../../../shared/analysis.ts";

export const resultFilters = [
  { key: "all", label: fr.allResults },
  { key: "matches", label: fr.matches },
  { key: "gaps", label: fr.gaps },
  { key: "unknowns", label: fr.unknowns },
  { key: "needsReview", label: fr.review },
] as const;

export type ResultFilter = (typeof resultFilters)[number]["key"];

export function isCoverageFinding(
  finding: AnalysisResponseData["analysis"]["needsReview"][number],
) {
  return finding.verification?.code === "MISSING_REQUIREMENT_ANALYSIS";
}

export function ResultFilters({
  value,
  onChange,
  result,
}: {
  value: ResultFilter;
  onChange: (value: ResultFilter) => void;
  result: AnalysisResponseData;
}) {
  const counts = {
    ...result.analysis,
    needsReview: result.analysis.needsReview.filter(
      (item) => !isCoverageFinding(item),
    ),
  };

  return (
    <div
      role="group"
      aria-label={fr.filterResults}
      className="my-5 flex flex-wrap gap-2"
    >
      {resultFilters.map((filter) => (
        <Button
          key={filter.key}
          variant={filter.key === value ? "default" : "outline"}
          aria-pressed={filter.key === value}
          onClick={() => onChange(filter.key)}
        >
          {filter.label} (
          {filter.key === "all"
            ? Object.values(counts).flat().length
            : counts[filter.key].length}
          )
        </Button>
      ))}
    </div>
  );
}

export function CoverageNotice({ result }: { result: AnalysisResponseData }) {
  const missing = result.analysis.needsReview.filter(isCoverageFinding);

  if (!missing.length) {
    return null;
  }

  return (
    <details className="my-4 rounded-md border border-warning bg-warning-background p-4 text-warning">
      <summary className="font-semibold">{fr.incompleteCoverage}</summary>
      <p className="my-3 text-sm">{fr.coverageHelp}</p>
      <div className="my-4 grid gap-3 text-sm sm:grid-cols-2">
        <p>
          <strong>{fr.candidateActionTitle}</strong>{" "}
          {fr.candidateCoverageAction}
        </p>
        <p>
          <strong>{fr.recruiterActionTitle}</strong>{" "}
          {fr.recruiterCoverageAction}
        </p>
      </div>
      <p className="mb-3 text-xs">{fr.coverageSourceHelp}</p>
      <ul className="list-disc space-y-3 pl-5 text-sm whitespace-pre-wrap break-words">
        {missing.map((finding, index) => (
          <li key={index}>{finding.jobQuote}</li>
        ))}
      </ul>
    </details>
  );
}

export function OfferContext({
  result,
  onInclude,
}: {
  result: AnalysisResponseData;
  onInclude?: ((quote: string) => void) | undefined;
}) {
  const contextual = result.metadata.contextPassages ?? [];

  if (!contextual.length) {
    return null;
  }

  return (
    <details className="my-3 rounded-md border border-border p-4 text-sm text-foreground">
      <summary>{fr.offerContext}</summary>
      <p className="my-3">{fr.contextClassificationHelp}</p>
      <ul className="list-disc space-y-2 pl-5 whitespace-pre-wrap break-words">
        {contextual.map((item, index) => (
          <li key={index}>
            {item.quote}{" "}
            {onInclude && (
              <Button variant="outline" onClick={() => onInclude(item.quote)}>
                {fr.includeCriterion}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
