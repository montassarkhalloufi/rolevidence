// Tolérance typographique uniquement : aucun rapprochement flou, aucune
// suppression de mots, nombres ou négations. Le résultat est un extrait original.
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

  // Tenter aussi la citation intacte, qui peut légitimement contenir des guillemets.
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
