import { test, expect } from "@playwright/test";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/server/infrastructure/persistence/database.ts";
import { createDossierRepository } from "../../src/server/infrastructure/persistence/dossiers.ts";
import { createApp } from "../../src/server/infrastructure/http/app.ts";
import { createAnalysisService } from "../../src/server/application/analyze.ts";
import { createProviderRegistry } from "../../src/server/application/provider-registry.ts";

function backend(path: string) {
  const db = openDatabase(path);

  const service = createAnalysisService("test-model", async () => ({
    extraction: { requirements: [] },
    metadata: {
      provider: "openai",
      responseId: "fake-browser",
      model: "test-model",
      durationMs: 1,
      inputTokens: 1,
      outputTokens: 1,
    },
  }));

  const providers = createProviderRegistry([
    {
      option: { provider: "openai", model: "test-model", configured: true },
      service,
    },
    {
      option: {
        provider: "anthropic",
        model: "other-model",
        configured: false,
      },
      service,
    },
  ]);

  const server = createApp({
    service,
    providers,
    dossiers: createDossierRepository(db),
    readDocuments: async () => ({
      profile: "Camille utilise TypeScript.",
      job: "TypeScript requis.",
    }),
    model: "test-model",
    configured: true,
  }).listen(0, "127.0.0.1");

  return { server, db };
}

test("two local dossiers, saved analysis, server restart, immutable history and isolated deletion", async ({
  page,
}) => {
  const directory = await mkdtemp(join(tmpdir(), "rolevidence-browser-"));

  const path = join(directory, "test.sqlite");

  let runtime = backend(path);

  await once(runtime.server, "listening");

  async function stop() {
    runtime.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      runtime.server.close((error) => (error ? reject(error) : resolve())),
    );
    runtime.db.close();
  }

  try {
    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
      const address = runtime.server.address();

      if (!address || typeof address === "string") {
        throw new Error("missing test address");
      }

      const original = new URL(route.request().url());

      const response = await route.fetch({
        url: `http://127.0.0.1:${address.port}${original.pathname}${original.search}`,
      });

      await route.fulfill({ response });
    });
    await page.goto("/");
    await page.getByLabel("Nom du dossier").fill("Première candidature");
    await page.getByRole("button", { name: "Créer un dossier" }).click();
    await expect(
      page.getByRole("button", { name: "Retour aux dossiers" }),
    ).toBeVisible();
    await page
      .getByLabel("Profil candidat · texte modifiable")
      .fill("Camille utilise TypeScript en production.");
    await page.getByRole("button", { name: "Offre d’emploi" }).click();
    await page
      .getByLabel("Offre · collez la description du poste")
      .fill("TypeScript requis.");
    await expect(
      page.getByRole("button", { name: "Analyser la correspondance" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Enregistrer le dossier" }).click();
    await page
      .getByRole("button", { name: "Analyser la correspondance" })
      .click();
    await expect(
      page.getByRole("button", { name: /openai · test-model/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retour aux dossiers" }).click();
    await page.getByLabel("Nom du dossier").fill("Deuxième candidature");
    await page.getByRole("button", { name: "Créer un dossier" }).click();
    await page.getByRole("button", { name: "Retour aux dossiers" }).click();
    await expect(
      page.getByRole("heading", { name: "Deuxième candidature" }),
    ).toBeVisible();
    await stop();
    runtime = backend(path);
    await once(runtime.server, "listening");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Première candidature" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Deuxième candidature" }),
    ).toBeVisible();
    const first = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "Première candidature" }),
    });

    await first.getByRole("button", { name: "Ouvrir" }).click();
    await expect(
      page.getByLabel("Profil candidat · texte modifiable"),
    ).toHaveValue("Camille utilise TypeScript en production.");
    await page
      .getByLabel("Profil candidat · texte modifiable")
      .fill("Profil modifié après analyse.");
    await page.getByRole("button", { name: "Enregistrer le dossier" }).click();
    await page.getByRole("button", { name: /openai · test-model/ }).click();
    await page
      .getByText("Documents exacts de cette analyse", { exact: true })
      .click();
    await expect(
      page
        .locator("pre")
        .filter({ hasText: "Camille utilise TypeScript en production." }),
    ).toBeVisible();
    await page.setViewportSize({ width: 375, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/dossier-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Retour aux dossiers" }).click();
    await first.getByRole("button", { name: "Supprimer", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Confirmer la suppression du dossier et de ses analyses",
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "Première candidature" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Deuxième candidature" }),
    ).toBeVisible();
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test("offer review is explicit and a failed save retains user edits", async ({
  page,
}) => {
  const directory = await mkdtemp(join(tmpdir(), "rolevidence-offer-browser-"));

  const runtime = backend(join(directory, "test.sqlite"));

  await once(runtime.server, "listening");
  let rejectSave = false;

  const sourceText =
    "Développeur backend. TypeScript et Node.js requis. Télétravail : hybride. Salaire : 65000.";

  try {
    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
      const original = new URL(route.request().url());

      if (original.pathname.endsWith("offer-imports")) {
        await route.fulfill({
          json: {
            source: {
              url: "https://example.com/job",
              retrievedAt: new Date().toISOString(),
              text: sourceText,
              fields: [
                {
                  name: "salary",
                  value: "65000 (unités non précisées)",
                  quote: "Salaire : 65000.",
                },
              ],
            },
            rejectedFields: 0,
          },
        });

        return;
      }

      if (rejectSave && route.request().method() === "PUT") {
        await route.fulfill({
          status: 507,
          json: { detail: "L’enregistrement local a échoué." },
        });

        return;
      }

      const address = runtime.server.address();

      if (!address || typeof address === "string") {
        throw new Error("missing test address");
      }

      await route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:${address.port}${original.pathname}${original.search}`,
        }),
      });
    });
    await page.goto("/");
    await page.getByLabel("Nom du dossier").fill("Import à vérifier");
    await page.getByRole("button", { name: "Créer un dossier" }).click();
    await page
      .locator("summary")
      .filter({ hasText: "Lien public de l’offre" })
      .click();
    await page
      .getByLabel("Lien public de l’offre", { exact: true })
      .fill("https://example.com/job");
    await page
      .getByRole("button", { name: "Importer et structurer l’offre" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Vérifier l’offre importée" }),
    ).toBeVisible();
    await expect(page.getByLabel("Salaire", { exact: true })).toHaveValue(
      "65000 (unités non précisées)",
    );
    await page.getByRole("button", { name: "Offre d’emploi" }).click();
    await expect(
      page.getByLabel("Offre · collez la description du poste"),
    ).toHaveValue("");
    await page
      .getByRole("button", { name: "Utiliser ce texte dans l’offre" })
      .click();
    await expect(
      page.getByLabel("Offre · collez la description du poste"),
    ).toHaveValue(sourceText);
    rejectSave = true;
    await page.getByRole("button", { name: "Enregistrer le dossier" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "L’enregistrement local a échoué.",
    );
    await expect(
      page.getByLabel("Offre · collez la description du poste"),
    ).toHaveValue(sourceText);
    rejectSave = false;
    await page.getByRole("button", { name: "Enregistrer le dossier" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Enregistré sur cet ordinateur" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retour aux dossiers" }).click();
    await expect(
      page.getByRole("heading", { name: "Import à vérifier" }),
    ).toBeVisible();
  } finally {
    runtime.server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      runtime.server.close((error) => (error ? reject(error) : resolve())),
    );
    runtime.db.close();
    await rm(directory, { recursive: true, force: true });
  }
});
