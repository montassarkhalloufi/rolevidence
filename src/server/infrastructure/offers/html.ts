import { load } from "cheerio";
import { DOCUMENT_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { AppError } from "../../application/errors.ts";

function postings(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || !value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => postings(item, depth + 1));
  }

  const record = value as Record<string, unknown>;

  if (
    record["@type"] === "JobPosting" ||
    (Array.isArray(record["@type"]) && record["@type"].includes("JobPosting"))
  ) {
    return [record];
  }

  return postings(record["@graph"], depth + 1);
}

function plain(html: string) {
  const $ = load(html);

  $("script,style,nav,footer,header,noscript,svg,form").remove();
  $("br").replaceWith("\n");
  $("p,li,div,h1,h2,h3,section").append("\n");

  return $.text()
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function extractJobText(html: string) {
  const $ = load(html);

  const jobs: Record<string, unknown>[] = [];

  $('script[type="application/ld+json"]').each((_index, element) => {
    try {
      jobs.push(...postings(JSON.parse($(element).text()) as unknown));
    } catch {
      /* Ignore malformed optional JSON-LD. */
    }
  });
  if (jobs.length > 1) {
    throw new AppError(
      "IMPORT_FAILED",
      "Cette page contient plusieurs offres. Ouvrez le lien d’une offre précise.",
    );
  }

  let text: string;

  if (jobs[0]) {
    text = Object.entries(jobs[0])
      .filter(([key]) => !key.startsWith("@"))
      .map(
        ([key, value]) =>
          `${key}: ${plain(typeof value === "string" ? value : JSON.stringify(value))}`,
      )
      .join("\n");
  } else {
    const content =
      $("main").first().html() ??
      $("article").first().html() ??
      $("body").html() ??
      "";

    text = plain(content);
  }

  if (text.length < 40 || text.length > DOCUMENT_MAX_CHARACTERS) {
    throw new AppError(
      "IMPORT_FAILED",
      "Contenu absent ou trop long. Collez uniquement le texte de l’offre.",
    );
  }

  return text;
}
