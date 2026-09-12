import { Badge, type BadgeTone } from "../../../shared/ui/badge.tsx";
import { StatusIcon } from "../../../shared/ui/status-icon.tsx";
import { fr } from "../../../shared/i18n/fr.ts";
import type { AnalysisResult } from "../../../../shared/analysis.ts";

type Finding = AnalysisResult["matches"][number];

type Props = {
  finding: Finding;
  expanded?: boolean;
  group: {
    tone: Exclude<BadgeTone, "outline">;
    symbol: string;
    singular: string;
  };
};

const relationLabels = {
  equivalence: fr.declaredMatch,
  indirect_evidence: fr.indirectEvidence,
  contradiction: fr.contradiction,
  insufficient_information: fr.insufficientInformation,
};

const stateLabels = {
  supported: fr.supported,
  contradicted: fr.contradicted,
  insufficient_information: fr.insufficientInformation,
};

const verificationLabels = {
  UNVERIFIED_QUOTES: fr.unverifiedConclusion,
  MISSING_CANDIDATE_INFORMATION: fr.missingInformation,
  INCOMPARABLE_EXPERIENCE: fr.incomparableExperience,
  MISSING_REQUIREMENT_ANALYSIS: fr.missingRequirementAnalysis,
};

function summary(finding: Finding) {
  return finding.verification
    ? verificationLabels[finding.verification.code]
    : finding.explanation;
}

function VerificationDetails({ finding }: { finding: Finding }) {
  const issue = finding.verification;

  if (!issue || issue.code === "MISSING_REQUIREMENT_ANALYSIS") {
    return null;
  }

  return (
    <div>
      <p>
        {fr.proposedConclusion} {finding.explanation}
      </p>
      {issue.code === "UNVERIFIED_QUOTES" &&
        issue.missingQuotes.includes("candidate") &&
        issue.proposedCandidateQuote && (
          <p>
            {fr.proposedCandidateQuote} {issue.proposedCandidateQuote}
          </p>
        )}
      {issue.code === "UNVERIFIED_QUOTES" &&
        issue.missingQuotes.includes("job") &&
        issue.proposedJobQuote && (
          <p>
            {fr.proposedJobQuote} {issue.proposedJobQuote}
          </p>
        )}
    </div>
  );
}

function SourceQuotes({ finding }: { finding: Finding }) {
  const quotes = [
    { label: fr.clarificationSource, text: finding.clarificationQuote },
    { label: fr.profileSource, text: finding.profileQuote },
    { label: fr.preferencesSource, text: finding.preferencesQuote },
    {
      label: fr.jobSource,
      text: finding.jobQuotes?.join("\n\n") || finding.jobQuote,
    },
  ].filter((quote) => quote.text);

  if (!quotes.length) {
    return <p>{fr.noQuotes}</p>;
  }

  return (
    <div className="grid gap-4 @md/quotes:grid-cols-2">
      {quotes.map((quote) => (
        <blockquote
          className="my-3 border-l-2 border-input bg-muted px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
          key={quote.label}
        >
          <small className="mb-1 block text-xs tracking-wide text-muted-foreground">
            {quote.label}
          </small>
          {quote.text}
        </blockquote>
      ))}
    </div>
  );
}

function wasReclassified(finding: Finding) {
  return (
    finding.verification?.code === "INCOMPARABLE_EXPERIENCE" ||
    finding.verification?.code === "MISSING_CANDIDATE_INFORMATION"
  );
}

export function EvidenceCard({ finding, group, expanded = false }: Props) {
  const corrected = wasReclassified(finding);

  return (
    <article className="flex gap-3 border-b border-border py-4 [&>div]:min-w-0 [&>div]:w-full [&_p]:my-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_summary]:text-sm [&_summary]:text-primary">
      <StatusIcon tone={group.tone}>{group.symbol}</StatusIcon>
      <div className="@container/quotes">
        <div className="flex flex-wrap items-center gap-2 [&>h3]:text-xl [&>h3]:font-semibold">
          <h3>{finding.subject}</h3>
          <Badge tone={group.tone}>{group.singular}</Badge>
        </div>
        <p>{summary(finding)}</p>
        {expanded && <SourceQuotes finding={finding} />}
        <details>
          <summary>{fr.viewQuotes}</summary>
          <p>
            <strong>
              {corrected
                ? fr.correctedModelInterpretation
                : relationLabels[finding.interpretation.relation]}
            </strong>
          </p>
          {finding.interpretation.describedPractice && (
            <p>
              {fr.practice} {finding.interpretation.describedPractice}
            </p>
          )}
          <p>
            {corrected && <strong>{fr.originalModelReasoning} </strong>}
            {finding.interpretation.justification}
          </p>
          <p>
            {fr.retainedState}{" "}
            {finding.verification?.code === "UNVERIFIED_QUOTES"
              ? fr.unverifiedEvidenceState
              : stateLabels[finding.evidenceState]}
            .
          </p>
          <VerificationDetails finding={finding} />
          {!expanded && <SourceQuotes finding={finding} />}
        </details>
      </div>
    </article>
  );
}
