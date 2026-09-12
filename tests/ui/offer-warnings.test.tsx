import { afterEach, test } from "vitest";
import assert from "node:assert/strict";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { OfferWarnings } from "../../src/client/features/analysis/components/OfferWarnings.tsx";
import { EvidenceCard } from "../../src/client/features/analysis/components/EvidenceCard.tsx";

afterEach(cleanup);

test("offer ambiguity is separate from conclusions and its original sources can be opened", async () => {
  render(
    <OfferWarnings
      warnings={[
        {
          explanation: "Seuils différents : à confirmer.",
          quotes: ["3 ans exigés.", "12 mois exigés."],
        },
      ]}
    />,
  );
  assert.ok(
    screen.getByRole("region", { name: "Ambiguïtés de l’offre à confirmer" }),
  );
  await userEvent.click(screen.getByText("Seuils différents : à confirmer."));
  assert.ok(screen.getByText("3 ans exigés."));
  assert.ok(screen.getByText("12 mois exigés."));
});

test("a consolidated criterion displays every original job quote", () => {
  render(
    <EvidenceCard
      expanded
      group={{ tone: "success", symbol: "✓", singular: "Correspondance" }}
      finding={{
        subject: "Node.js",
        explanation: "Pratique déclarée",
        evidenceState: "supported",
        verification: null,
        interpretation: {
          relation: "equivalence",
          describedPractice: "Node.js",
          justification: "Pratique déclarée",
        },
        profileQuote: "Camille utilise Node.js.",
        preferencesQuote: null,
        jobQuote: "Node.js requis.",
        jobQuotes: ["Node.js requis.", "Pratique de Node.js exigée."],
      }}
    />,
  );
  assert.ok(screen.getByText(/Node.js requis.*Pratique de Node.js exigée./s));
});
