import { fr } from "../../../shared/i18n/fr.ts";

type Warning = { explanation: string; quotes: string[] };

export function OfferWarnings({
  warnings,
}: {
  warnings?: Warning[] | undefined;
}) {
  if (!warnings?.length) {
    return null;
  }

  return (
    <section
      className="my-4 rounded-md border border-warning bg-warning-background p-4 text-warning"
      aria-label={fr.offerWarnings}
    >
      <h3 className="font-semibold">{fr.offerWarnings}</h3>
      {warnings.map((warning, index) => (
        <details key={index} className="mt-3 text-sm">
          <summary>{warning.explanation}</summary>
          {warning.quotes.map((quote) => (
            <blockquote
              key={quote}
              className="mt-2 whitespace-pre-wrap break-words border-l-2 border-warning pl-3"
            >
              {quote}
            </blockquote>
          ))}
        </details>
      ))}
    </section>
  );
}
