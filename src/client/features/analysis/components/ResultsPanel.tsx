import { findingLabel } from "../finding-label.ts";
import { OfferWarnings } from "./OfferWarnings.tsx";
import { ClarificationAnswer } from "../../case-files/ClarificationAnswer.tsx";
import { AnalysisProgress } from "./AnalysisProgress.tsx";
import { Alert } from "../../../shared/ui/alert.tsx";
import {
  ResultFilters,
  CoverageNotice,
  OfferContext,
  isCoverageFinding,
} from "./ResultFilters.tsx";
import type { ResultFilter } from "./ResultFilters.tsx";
import { useId, useState } from "react";
import { Badge } from "../../../shared/ui/badge.tsx";
import { CodeBlock } from "../../../shared/ui/code-block.tsx";
import { Card } from "../../../shared/ui/card.tsx";
import { Button } from "../../../shared/ui/button.tsx";
import { EvidenceCard } from "./EvidenceCard.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import type { AnalysisResponseData } from "../../../../shared/analysis.ts";

const groups = [
  {
    key: "needsReview",
    label: fr.review,
    singular: fr.reviewEvidence,
    symbol: "!",
    tone: "warning",
  },
  {
    key: "matches",
    label: fr.matches,
    singular: fr.match,
    symbol: "✓",
    tone: "success",
  },
  {
    key: "gaps",
    label: fr.gaps,
    singular: fr.gap,
    symbol: "◇",
    tone: "destructive",
  },
  {
    key: "unknowns",
    label: fr.unknowns,
    singular: fr.unknown,
    symbol: "?",
    tone: "neutral",
  },
] as const;

export function ResultsPanel({
  result,
  loading,
  saving = false,
  error,
  onClarify,
  onInclude,
}: {
  result: AnalysisResponseData | null;
  loading: boolean;
  saving?: boolean;
  error?: string | undefined;
  onClarify?: ((text: string) => void) | undefined;
  onInclude?: ((quote: string) => void) | undefined;
}) {
  const titleId = useId();

  const [filter, setFilter] = useState<ResultFilter>("all");

  if (loading) {
    return <AnalysisProgress saving={saving} />;
  }

  if (error) {
    return (
      <Alert>
        <h2 className="text-xl font-semibold">{fr.progressError}</h2>
        <p className="my-3">{fr.progressErrorHelp}</p>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <Card asChild className="@container/results">
      <section
        className="min-w-0"
        aria-labelledby={titleId}
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-editorial text-2xl" id={titleId}>
            {fr.evidenceWorkspace}
          </h2>
          <Badge tone="outline">{resultLabel(loading, result)}</Badge>
        </div>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
          {fr.analysisDescription}
        </p>
        {!result ? (
          <EmptyResults loading={loading} />
        ) : (
          <>
            <p className="my-5 border-l-2 border-input pl-3 text-sm leading-relaxed text-muted-foreground">
              {fr.reviewNote}
            </p>
            <OfferWarnings warnings={result.metadata.offerWarnings} />
            <ResultFilters
              value={filter}
              onChange={setFilter}
              result={result}
            />
            <CoverageNotice result={result} />
            <EvidenceReader
              key={`${filter}-${result.metadata.responseId}`}
              result={result}
              filter={filter}
              onClarify={onClarify}
            />
            <details className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
              <summary>{fr.analysisDetails}</summary>
              <AnalysisMetadata result={result} />
              <OfferContext result={result} onInclude={onInclude} />
              <details className="mt-2 text-sm text-primary">
                <summary>{fr.inspectJson}</summary>
                <CodeBlock>{JSON.stringify(result, null, 2)}</CodeBlock>
              </details>
            </details>
          </>
        )}
      </section>
    </Card>
  );
}

function resultLabel(loading: boolean, result: AnalysisResponseData | null) {
  if (loading) {
    return fr.pending;
  }

  return result ? fr.realResponse : fr.explore;
}

function AnalysisMetadata({ result }: { result: AnalysisResponseData }) {
  return (
    <div className="flex flex-wrap gap-3 py-4 text-xs text-muted-foreground">
      <span>
        {result.metadata.provider} · {result.metadata.model}
      </span>
      <span>{result.metadata.promptVersion}</span>
      <span>{(result.metadata.durationMs / 1000).toFixed(1)} s</span>
      <span>
        {result.metadata.inputTokens ?? "—"}
        {fr.inputTokens} {result.metadata.outputTokens ?? "—"}
        {fr.outputTokens}
      </span>
    </div>
  );
}

function EmptyResults({ loading }: { loading: boolean }) {
  return (
    <div
      className="flex min-h-80 flex-col items-center justify-center px-4 py-8 text-center [&>h3]:mb-3 [&>h3]:max-w-xs [&>h3]:font-editorial [&>h3]:text-2xl [&>p]:max-w-sm [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground"
      role="status"
    >
      <div
        className={`mb-5 flex size-20 items-center justify-center rounded-full border border-border bg-muted font-editorial text-5xl text-primary ${loading ? "motion-safe:animate-pulse" : ""}`}
      >
        {loading ? "◌" : "⌁"}
      </div>
      <h3>{loading ? fr.reading : fr.emptyTitle}</h3>
      <p>{loading ? fr.waitingDescription : fr.emptyDescription}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground [&>span]:rounded-sm [&>span]:border [&>span]:border-border [&>span]:px-2 [&>span]:py-2 [&>i]:not-italic">
        <span>{fr.yourProfile}</span>
        <i>→</i>
        <span>{fr.job}</span>
        <i>→</i>
        <span>{fr.findings}</span>
      </div>
    </div>
  );
}

function EvidenceReader({
  result,
  filter,
  onClarify,
}: {
  result: AnalysisResponseData;
  filter: ResultFilter;
  onClarify?: ((text: string) => void) | undefined;
}) {
  const [selected, setSelected] = useState(0);

  const items = groups
    .filter((group) => filter === "all" || filter === group.key)
    .flatMap((group) =>
      result.analysis[group.key]
        .filter((finding) => !isCoverageFinding(finding))
        .map((finding) => ({ finding, group })),
    );

  const current = items[selected] ?? items[0];

  if (!current) {
    return (
      <p role="status" className="py-8 text-muted-foreground">
        {fr.noFilteredResults}
      </p>
    );
  }

  return (
    <div className="grid items-start gap-5 @3xl/results:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
      <div
        aria-label={fr.filterResults}
        className="min-w-0 divide-y divide-border overflow-hidden rounded-md border border-border"
      >
        {items.map(({ finding, group }, index) => (
          <Button
            key={`${group.key}-${index}`}
            variant="ghost"
            aria-pressed={index === selected}
            aria-label={`${finding.subject} · ${findingLabel(finding, group.singular)}`}
            onClick={() => setSelected(index)}
            className={`h-auto w-full justify-start rounded-none border-l-4 px-4 py-4 text-left whitespace-normal ${index === selected ? "border-primary bg-accent" : "border-transparent"}`}
          >
            <span className="min-w-0 space-y-2 break-words">
              <span className="block font-semibold">{finding.subject}</span>
              <Badge tone={group.tone}>
                {findingLabel(finding, group.singular)}
              </Badge>
            </span>
          </Button>
        ))}
      </div>
      <div className="min-w-0 rounded-md border border-border bg-card p-4 sm:p-6">
        <p className="text-xs tracking-widest text-muted-foreground">
          {fr.selectedCriterion}
        </p>
        <EvidenceCard
          key={`${current.group.key}-${selected}`}
          finding={current.finding}
          group={current.group}
          expanded
        />
        {onClarify && (
          <ClarificationAnswer
            key={`clarification-${current.group.key}-${selected}`}
            subject={current.finding.subject}
            onAnswer={onClarify}
          />
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {fr.evidenceLimits}
        </p>
      </div>
    </div>
  );
}
