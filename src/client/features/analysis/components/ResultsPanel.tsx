import { useId } from "react";
import { Badge } from "../../../shared/ui/badge.tsx";
import { CodeBlock } from "../../../shared/ui/code-block.tsx";
import { Card } from "../../../shared/ui/card.tsx";
import { StatusIcon } from "../../../shared/ui/status-icon.tsx";
import { EvidenceCard } from "./EvidenceCard.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import type { AnalysisResponseData } from "../../../../shared/analysis.ts";

const groups = [
  {
    key: "needsReview",
    label: fr.review,
    singular: fr.reviewEvidence,
    symbol: "!",
    tone: "neutral",
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
    tone: "warning",
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
}: {
  result: AnalysisResponseData | null;
  loading: boolean;
}) {
  const titleId = useId();

  return (
    <Card asChild>
      <section
        className="min-w-0"
        aria-labelledby={titleId}
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-editorial text-2xl" id={titleId}>
            <span className="mr-2 text-muted-foreground">02 /</span>
            {fr.analysisTitle}
          </h2>
          <Badge tone="outline">{resultLabel(loading, result)}</Badge>
        </div>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
          {fr.analysisDescription}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {groups.map((group) => (
            <div
              className="flex min-w-0 items-center gap-3 rounded-md border border-border p-3 [&_strong]:block [&_strong]:text-2xl [&_div>span]:text-xs [&_div>span]:text-muted-foreground"
              key={group.key}
            >
              <StatusIcon tone={group.tone}>{group.symbol}</StatusIcon>
              <div>
                <strong>
                  {result ? result.analysis[group.key].length : "—"}
                </strong>
                <span>{group.label}</span>
              </div>
            </div>
          ))}
        </div>
        {!result ? (
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
        ) : (
          <>
            <p className="my-5 border-l-2 border-input pl-3 text-sm leading-relaxed text-muted-foreground">
              {fr.reviewNote}
            </p>
            <div className="lg:max-h-120 lg:overflow-y-auto">
              {groups.map((group) => (
                <div key={group.key}>
                  {result.analysis[group.key].map((finding, index) => (
                    <EvidenceCard
                      key={`${group.key}-${index}`}
                      finding={finding}
                      group={group}
                    />
                  ))}
                </div>
              ))}
            </div>
            <AnalysisMetadata result={result} />
            <details className="mt-2 text-sm text-primary">
              <summary>{fr.inspectJson}</summary>
              <CodeBlock>{JSON.stringify(result, null, 2)}</CodeBlock>
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
