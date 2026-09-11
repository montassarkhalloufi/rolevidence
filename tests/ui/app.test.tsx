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
  await screen.findByText("Pratique déclarée.");
  assert.equal(calls, 1);
  assert.match(key ?? "", /^[a-f0-9-]{36}$/);
  await user.click(screen.getByText("Voir les passages cités"));
  assert.ok(screen.getByText("Déclaration explicite."));
  await user.type(editor, " Nouvelle information.");
  await waitFor(() =>
    assert.equal(screen.queryByText("Pratique déclarée."), null),
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
