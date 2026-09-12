import { isResponseDirective } from "../../domain/document-directives.ts";
import type { DocumentsInput } from "../../domain/models.ts";
import { preferencesText } from "../../domain/preferences.ts";

export type SourcePassage = {
  id: string;
  text: string;
  criterion?: string;
  sourceQuotes?: string[];
};

export type SourceCatalog = ReturnType<typeof createSourceCatalog>;

function passages(text: string, prefix: string): SourcePassage[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `${prefix}${index + 1}`, text }));
}

export function createSourceCatalog(documents: DocumentsInput) {
  return {
    profile: profilePassages(documents.profile),
    clarifications: passages(documents.clarifications ?? "", "C").filter(
      (item) => !isResponseDirective(item.text),
    ),
    job: uniqueJobPassages(passages(documents.job, "J")),
    preferences: passages(preferencesText(documents.preferences), "R"),
  };
}

function uniqueJobPassages(items: SourcePassage[]) {
  const seen = new Set<string>();

  return items.filter(({ text }) => {
    if (seen.has(text)) {
      return false;
    }

    seen.add(text);

    return true;
  });
}

export function substantiveJobPassages(catalog: SourceCatalog) {
  // Markdown headings describe the role; content lines must not silently disappear.
  return catalog.job.filter((passage) => !/^#{1,6}\s/u.test(passage.text));
}

function isHeading(line: string) {
  return /^[\p{Lu}\d][\p{Lu}\d &/—–-]+$/u.test(line.trim());
}

function segmentableProfile(text: string) {
  const lines = text.split(/(?<=\n)/u);

  return lines
    .map((line, index) => {
      if (
        isHeading(line) ||
        isHeading(lines[index + 1] ?? "") ||
        !line.trim()
      ) {
        return line;
      }

      // Keep UTF-16 offsets identical while treating soft line wraps as spaces.
      return line.replace(/[\r\n]/gu, " ");
    })
    .join("");
}

function profilePassages(text: string): SourcePassage[] {
  const segmenter = new Intl.Segmenter("fr", { granularity: "sentence" });

  return Array.from(
    segmenter.segment(segmentableProfile(text)),
    ({ index, segment }) => text.slice(index, index + segment.length).trim(),
  )
    .filter((text) => Boolean(text) && !isResponseDirective(text))
    .map((text, index) => ({ id: `P${index + 1}`, text }));
}
