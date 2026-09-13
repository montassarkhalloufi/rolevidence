import { findingSummary } from "../analysis/finding-summary.ts";
import { findingLabel } from "../analysis/finding-label.ts";
import type { SavedAnalysisData } from "../../../shared/case-files.ts";
import { fr } from "../../shared/i18n/fr.ts";

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) => `&#${character.charCodeAt(0)};`,
  );
}

export function renderReport(saved: SavedAnalysisData) {
  const labels = {
    matches: fr.matches,
    gaps: fr.gaps,
    unknowns: fr.unknowns,
    needsReview: fr.review,
  };

  const groups = Object.entries(saved.result.analysis)
    .map(([key, findings]) => {
      const label = labels[key as keyof typeof labels];

      return `<section><h2>${escape(label)}</h2>${findings
        .map(
          (finding) =>
            `<article><h3>${escape(finding.subject)}</h3><p>${escape(findingLabel(finding, label))}</p><p>${escape(findingSummary(finding))}</p>${finding.verification ? `<details><summary>${escape(fr.originalModelReasoning)}</summary><p>${escape(finding.explanation)}</p><p>${escape(finding.interpretation.justification)}</p></details><p><strong>${escape(fr.reviewEvidence)}</strong> · ${escape(finding.verification.code)}</p>` : ""}${[
              [fr.profileSource, finding.profileQuote],
              [fr.clarificationSource, finding.clarificationQuote],
              [fr.preferencesSource, finding.preferencesQuote],
              [
                fr.jobSource,
                finding.jobQuotes?.join("\n\n") || finding.jobQuote,
              ],
            ]
              .filter((entry) => entry[1])
              .map(
                ([source, quote]) =>
                  `<h4>${escape(source ?? "")}</h4><blockquote>${escape(quote ?? "")}</blockquote>`,
              )
              .join("")}</article>`,
        )
        .join("")}</section>`;
    })
    .join("");

  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${escape(saved.snapshot.title)}</title><style>body{font:16px system-ui;line-height:1.6;max-width:960px;margin:2rem auto;padding:1rem;color:#171a32}article{border-top:1px solid #ccc;padding:1rem 0;break-inside:avoid}blockquote,pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f7fb;padding:1rem}h1,h2{line-height:1.2}@media print{body{margin:0}details{display:block}}</style><h1>${escape(saved.snapshot.title)}</h1><p>Rolevidence · ${escape(saved.createdAt)}</p><p>${escape(fr.reviewNote)} ${escape(fr.evidenceLimits)}</p>${groups}<h2>${escape(fr.analysisDetails)}</h2><pre>${escape(JSON.stringify(saved.result.metadata, null, 2))}</pre><h2>${escape(fr.reportSources)}</h2><pre>${escape(JSON.stringify(saved.snapshot, null, 2))}</pre></html>`;
}
