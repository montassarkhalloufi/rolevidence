import { test, expect } from "@playwright/test";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { openDatabase } from "../../src/server/infrastructure/persistence/database.ts";
import { createDossierRepository } from "../../src/server/infrastructure/persistence/dossiers.ts";
import { createCampaignRepository } from "../../src/server/infrastructure/persistence/campaigns.ts";
import { createJobRepository } from "../../src/server/infrastructure/persistence/jobs.ts";
import { createJobRunner } from "../../src/server/application/jobs.ts";
import { createAnalysisService } from "../../src/server/application/analyze.ts";
import { createProviderRegistry } from "../../src/server/application/provider-registry.ts";
import { createApp } from "../../src/server/infrastructure/http/app.ts";

function backend() {
  const db = openDatabase(":memory:");

  const dossiers = createDossierRepository(db);

  const service = createAnalysisService(
    "test-workflow",
    async ({ documents }, signal, execution) => {
      execution?.onProgress({ stage: "comparison", completed: 1, total: 2 });
      await delay(1500, undefined, { signal });

      return {
        extraction: {
          requirements: [
            {
              subject: "TypeScript",
              explanation: "Pratique déclarée",
              candidateSource: "profile",
              candidateInformation: "provided",
              profileQuote: documents.profile,
              preferencesQuote: null,
              jobQuote: documents.job,
              interpretation: {
                relation: "equivalence",
                describedPractice: "TypeScript",
                justification: "Déclaration",
              },
            },
          ],
        },
        metadata: {
          model: "test-workflow",
          provider: "openai",
          responseId: "fictional-workflow",
          inputTokens: 1,
          outputTokens: 1,
          durationMs: 1500,
        },
      };
    },
  );

  const providers = createProviderRegistry([
    {
      option: { provider: "openai", model: "test-workflow", configured: true },
      service,
    },
  ]);

  const workflows = {
    campaigns: createCampaignRepository(db, dossiers),
    jobs: createJobRunner(
      createJobRepository(db),
      dossiers,
      () => service,
      () => new Date().toISOString(),
    ),
  };

  const server = createApp({
    workflows,
    dossiers,
    providers,
    service,
    model: "test-workflow",
    configured: true,
    readDocuments: async () => ({
      profile: "Camille utilise TypeScript.",
      job: "TypeScript requis.",
    }),
  }).listen(0, "127.0.0.1");

  return { db, server, workflows };
}

for (const purpose of ["job_search", "recruiting"] as const) {
  test(`campaign, tracking, progress and explicit cancellation/resume for ${purpose}`, async ({
    page,
  }) => {
    const runtime = backend();

    await once(runtime.server, "listening");
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.route("http://127.0.0.1:5174/api/**", async (route) => {
        const address = runtime.server.address();

        if (!address || typeof address === "string") {
          throw new Error("missing address");
        }

        const url = new URL(route.request().url());

        await route.fulfill({
          response: await route.fetch({
            url: `http://127.0.0.1:${address.port}${url.pathname}${url.search}`,
          }),
        });
      });
      await page.setViewportSize({
        width: purpose === "job_search" ? 375 : 1280,
        height: 900,
      });
      await page.goto("/");
      await page
        .getByLabel("Nom du dossier", { exact: true })
        .fill("Dossier source");
      await page.getByRole("button", { name: "Créer un dossier" }).click();
      await page
        .getByRole("combobox", { name: "Usage", exact: true })
        .selectOption(purpose);
      await page
        .getByLabel("Profil candidat · texte modifiable")
        .fill("Camille utilise TypeScript.");
      await page.getByRole("button", { name: "Offre d’emploi" }).click();
      await page
        .getByLabel("Offre · collez la description du poste")
        .fill("TypeScript requis.");
      await page.getByText("Suivi de la candidature", { exact: true }).click();
      await page
        .getByRole("combobox", { name: "Avancement", exact: true })
        .selectOption("interview");
      await page
        .getByLabel("Notes personnelles", { exact: true })
        .fill("Note humaine privée");
      await page
        .getByRole("button", { name: "Enregistrer le dossier", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Enregistrer le dossier",
          exact: true,
        }),
      ).toBeDisabled();
      await page
        .getByText(
          purpose === "job_search"
            ? "Comparer ce profil à plusieurs offres"
            : "Comparer plusieurs profils à cette offre",
          { exact: true },
        )
        .click();
      await page
        .getByLabel("Nom de la campagne", { exact: true })
        .fill("Campagne comparée");
      await page
        .getByLabel("Nom du dossier 1", { exact: true })
        .fill("Comparaison A");
      await page
        .getByLabel("Nom du dossier 2", { exact: true })
        .fill("Comparaison B");
      const textLabel =
        purpose === "job_search" ? "Texte de l’offre" : "Texte du profil";

      await page
        .getByLabel(`${textLabel} 1`, { exact: true })
        .fill(
          purpose === "job_search"
            ? "TypeScript requis."
            : "Riley utilise TypeScript.",
        );
      await page
        .getByLabel(`${textLabel} 2`, { exact: true })
        .fill(
          purpose === "job_search"
            ? "TypeScript requis."
            : "Morgan utilise TypeScript.",
        );
      if (purpose === "recruiting") {
        await page
          .getByLabel("Importer un CV 1", { exact: true })
          .setInputFiles({
            name: "fictional-riley.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("Riley utilise TypeScript."),
          });
        await expect(
          page.getByLabel(`${textLabel} 1`, { exact: true }),
        ).toHaveValue("Riley utilise TypeScript.");
      }

      await page
        .getByRole("button", { name: "Créer la campagne", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Campagne comparée" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Ouvrir le dossier", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", {
          name: "Analyser la correspondance",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("region", { name: "Progression réelle" }),
      ).toContainText("1 / 2");
      await page
        .getByRole("button", { name: "Annuler l’analyse", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Progression réelle" }),
      ).toContainText("Analyse annulée");
      await page
        .getByRole("button", { name: "Retour aux dossiers", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Ouvrir le dossier", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", {
          name: "Reprendre les étapes restantes",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("region", { name: "Progression réelle" }),
      ).toContainText("Analyse enregistrée");
      await expect(
        page.getByRole("button", { name: /openai · test-workflow/ }),
      ).toHaveCount(1);
      await page
        .getByRole("button", { name: "Retour aux dossiers", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Campagne comparée" }),
      ).toBeVisible();
      await expect(
        page.getByText("TypeScript", { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Ouvrir le dossier", exact: true })
        .nth(1)
        .click();
      await page
        .getByRole("button", {
          name: "Analyser la correspondance",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("region", { name: "Progression réelle" }),
      ).toContainText("Analyse enregistrée");
      await page
        .getByRole("button", { name: "Retour aux dossiers", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Les faits, face aux exigences." }),
      ).toHaveCount(2);
      if (purpose === "recruiting") {
        await expect(
          page
            .locator("blockquote")
            .filter({ hasText: "Riley utilise TypeScript." }),
        ).toHaveCount(1);
        await expect(
          page
            .locator("blockquote")
            .filter({ hasText: "Morgan utilise TypeScript." }),
        ).toHaveCount(1);
      }

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const quote = await page.locator("blockquote").first().boundingBox();

      expect(quote?.width).toBeGreaterThan(150);
      await page.screenshot({
        path: `test-results/campaign-${purpose}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Retour aux dossiers", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Dossier source", exact: true })
        .locator("..", {})
        .locator("..")
        .getByRole("button", { name: "Ouvrir", exact: true })
        .click();
      await page.getByText("Suivi de la candidature", { exact: true }).click();
      await expect(
        page.getByLabel("Notes personnelles", { exact: true }),
      ).toHaveValue("Note humaine privée");
      expect(errors).toEqual([]);
    } finally {
      runtime.server.closeAllConnections();
      await new Promise<void>((resolve) =>
        runtime.server.close(() => resolve()),
      );
      runtime.db.close();
    }
  });
}
