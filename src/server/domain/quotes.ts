// Typographic tolerance only: no fuzzy matching or removal of words, numbers
// or negations. The result is an original source excerpt.
function canonicalCharacter(character: string): string {
  return character
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010\u2011]/g, "-")
    .replace(/\s/gu, " ");
}

function indexedText(text: string) {
  let normalized = "";

  const starts: number[] = [],
    ends: number[] = [];

  let offset = 0;

  for (const character of text) {
    for (const part of canonicalCharacter(character)) {
      if (part === " " && normalized.endsWith(" ")) {
        ends[ends.length - 1] = offset + character.length;
        continue;
      }

      normalized += part;
      for (let i = 0; i < part.length; i++) {
        starts.push(offset);
        ends.push(offset + character.length);
      }
    }

    offset += character.length;
  }

  return { normalized, starts, ends };
}

export function resolveQuote(
  source: string,
  quote: string | null,
): string | null {
  if (!quote?.trim()) {
    return null;
  }

  const stripped = quote
    .trim()
    .replace(
      /^(?:"([\s\S]*)"|“([\s\S]*)”|«\s*([\s\S]*?)\s*»)$/,
      (_, a, b, c) => a ?? b ?? c,
    );

  const indexed = indexedText(source);

  // Also try the intact quotation, which may legitimately contain quote marks.
  for (const candidate of [quote.trim(), stripped]) {
    const normalized = indexedText(candidate).normalized.trim();

    if (!normalized) {
      continue;
    }

    const index = indexed.normalized.indexOf(normalized);

    if (index < 0) {
      continue;
    }

    const start = indexed.starts[index],
      end = indexed.ends[index + normalized.length - 1];

    if (start !== undefined && end !== undefined) {
      return source.slice(start, end);
    }
  }

  return null;
}
