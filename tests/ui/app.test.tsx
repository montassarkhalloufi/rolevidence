import { EvidenceCard } from "../../src/client/features/analysis/components/EvidenceCard.tsx";
import { test, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { App } from "../../src/client/App.tsx";
import { Providers } from "../../src/client/app/providers.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const documents = {
  profile: "Camille utilise TypeScript.",
  job: "TypeScript requis.",
};

const output = {
  analysis: {
    matches: [
      {
        subject: "TypeScript",
        explanation: "Pratique déclarée.",
        interpretation: {
          describedPractice: "TypeScript",
          relation: "equivalence",
          justification: "Déclaration explicite.",
        },
        evidenceState: "supported",
        verification: null,
        profileQuote: "TypeScript",
        preferencesQuote: null,
        jobQuote: "TypeScript",
      },
    ],
    gaps: [],
    unknowns: [],
    needsReview: [],
  },
  metadata: {
    responseId: "fake-ui",
    model: "fake",
    durationMs: 10,
    inputTokens: 1,
    outputTokens: 1,
  },
};

test("User submits explicitly, sees evidence, and edits invalidate results (fake HTTP)", async () => {
  let calls = 0;

  let key: string | null = null;

  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.endsWith("/bootstrap")) {
      return Response.json({ documents, configured: true, model: "fake" });
    }

    assert.equal(url, "/api/v1/analyses");
    calls++;
    key = new Headers(init?.headers).get("Idempotency-Key");

    return Response.json(output);
  });

  const user = userEvent.setup();

  render(
    <Providers>
      <App />
    </Providers>,
  );
  const editor = await screen.findByRole("textbox", {
    name: /Profil candidat/,
  });

  assert.equal(calls, 0);
  await user.click(
    screen.getByRole("button", { name: /Analyser la correspondance/ }),
  );
  await screen.findByText("Déclaration explicite.");
  assert.equal(calls, 1);
  assert.match(key ?? "", /^[a-f0-9-]{36}$/);
  await user.click(screen.getByText("Voir les passages cités"));
  assert.ok(screen.getByText("Déclaration explicite."));
  await user.type(editor, " Nouvelle information.");
  await waitFor(() =>
    assert.equal(screen.queryByText("Déclaration explicite."), null),
  );
  assert.equal(calls, 1);
});
test("Provider failure is visible and never automatically retried (fake HTTP)", async () => {
  let calls = 0;

  vi.stubGlobal("fetch", async (url: string) => {
    if (url.endsWith("/bootstrap")) {
      return Response.json({ documents, configured: true, model: "fake" });
    }

    calls++;

    return Response.json(
      {
        type: "about:blank",
        title: "Bad Gateway",
        status: 502,
        detail: "Service indisponible.",
        code: "CONNECTION",
        requestId: "fake",
      },
      { status: 502 },
    );
  });

  const user = userEvent.setup();

  render(
    <Providers>
      <App />
    </Providers>,
  );
  await user.click(
    await screen.findByRole("button", { name: /Analyser la correspondance/ }),
  );
  await screen.findByRole("alert");
  assert.ok(screen.getByText("Service indisponible."));
  assert.equal(calls, 1);
});

test("A corrected model contradiction is explicitly labelled as rejected reasoning", () => {
  render(
    <EvidenceCard
      group={{ tone: "neutral", symbol: "?", singular: "Inconnue" }}
      finding={{
        subject: "Expérience backend",
        explanation: "Durée à clarifier.",
        interpretation: {
          relation: "contradiction",
          describedPractice: "Ancienneté déclarée.",
          justification: "Raisonnement incorrect du modèle.",
        },
        evidenceState: "insufficient_information",
        profileQuote: "9+ ans fullstack.",
        jobQuote: "12 ans backend.",
        preferencesQuote: null,
        verification: {
          code: "INCOMPARABLE_EXPERIENCE",
          missingQuotes: [],
          proposedCandidateQuote: "9+ ans fullstack.",
          proposedJobQuote: "12 ans backend.",
        },
      }}
    />,
  );

  assert.ok(
    screen.getByText("Interprétation du modèle corrigée par les règles"),
  );
  assert.ok(screen.getByText("Raisonnement initial du modèle, non retenu :"));
  assert.equal(screen.queryByText("Contradiction explicite"), null);
  assert.equal(
    screen.queryByText(/Citation candidat proposée, non vérifiée/),
    null,
  );
});

test("Unverified candidate evidence does not invalidate the verified job quote or claim support", () => {
  render(
    <EvidenceCard
      group={{ tone: "neutral", symbol: "!", singular: "Preuve à vérifier" }}
      finding={{
        subject: "TypeScript",
        explanation: "Pratique proposée.",
        interpretation: {
          relation: "equivalence",
          describedPractice: "API TypeScript",
          justification: "Interprétation proposée.",
        },
        evidenceState: "supported",
        profileQuote: null,
        jobQuote: "TypeScript requis.",
        preferencesQuote: null,
        verification: {
          code: "UNVERIFIED_QUOTES",
          missingQuotes: ["candidate"],
          proposedCandidateQuote: "Citation inventée.",
          proposedJobQuote: "TypeScript requis.",
        },
      }}
    />,
  );

  assert.ok(screen.getByText(/Conclusion non validée : preuve à vérifier/));
  assert.ok(screen.getByText(/Citation candidat proposée, non vérifiée/));
  assert.equal(
    screen.queryByText(/Citation offre proposée, non vérifiée/),
    null,
  );
  assert.equal(screen.queryByText(/État retenu par le code : Soutenue/), null);
});

test("result filters keep omissions separate from candidate conclusions", async () => {
  const { ResultsPanel } =
    await import("../../src/client/features/analysis/components/ResultsPanel.tsx");

  const { AnalysisResponse } = await import("../../src/shared/analysis.ts");

  const { unassessedRequirement } =
    await import("../../src/server/domain/coverage.ts");

  const result = AnalysisResponse.parse({
    ...output,
    analysis: {
      ...output.analysis,
      needsReview: [unassessedRequirement("Tests unitaires requis.")],
    },
    metadata: {
      ...output.metadata,
      contextPassages: [
        { quote: "Entreprise fondée en 2003.", reason: "company_background" },
      ],
    },
  });

  render(<ResultsPanel result={result} loading={false} />);
  const user = userEvent.setup();

  assert(screen.getByRole("heading", { name: "TypeScript" }));
  assert(screen.getByText(/Points non évalués/));
  assert(screen.getByRole("button", { name: "À vérifier (0)" }));
  await user.click(screen.getByRole("button", { name: "Inconnues (0)" }));
  assert.equal(screen.queryByRole("heading", { name: "TypeScript" }), null);
  await user.click(screen.getByRole("button", { name: "Correspondances (1)" }));
  assert(screen.getByRole("heading", { name: "TypeScript" }));
});

test("criterion selection displays its own source quotations", async () => {
  const { ResultsPanel } =
    await import("../../src/client/features/analysis/components/ResultsPanel.tsx");

  const { AnalysisResponse } = await import("../../src/shared/analysis.ts");

  const first = output.analysis.matches[0];

  const result = AnalysisResponse.parse({
    ...output,
    analysis: {
      ...output.analysis,
      matches: [
        first,
        {
          ...first,
          subject: "Node.js",
          profileQuote: "API Node.js en production",
          jobQuote: "Node.js requis",
        },
      ],
    },
  });

  render(<ResultsPanel result={result} loading={false} />);
  const user = userEvent.setup();

  await user.click(
    screen.getByRole("button", { name: /Node.js · Correspondance/ }),
  );
  assert(screen.getByRole("heading", { name: "Node.js" }));
  assert(screen.getByText("API Node.js en production"));
  assert(screen.getByText("Node.js requis"));
  assert.equal(screen.queryByRole("heading", { name: "TypeScript" }), null);
});

test("analysis progress takes focus and failure replaces the loader", async () => {
  const { ResultsPanel } =
    await import("../../src/client/features/analysis/components/ResultsPanel.tsx");

  const view = render(<ResultsPanel result={null} loading saving />);

  assert(screen.getByRole("heading", { name: "Analyse en cours" }));
  assert(screen.getByText("Enregistrement du dossier…"));
  assert.equal(
    document.activeElement,
    screen.getByLabelText("Analyse en cours"),
  );
  view.rerender(<ResultsPanel result={null} loading />);
  assert(screen.getByText("Lecture de l’offre et comparaison du profil…"));
  view.rerender(
    <ResultsPanel
      result={null}
      loading={false}
      error="Fournisseur indisponible."
    />,
  );
  assert(screen.getByRole("alert"));
  assert.equal(
    screen.queryByRole("heading", { name: "Analyse en cours" }),
    null,
  );
});
