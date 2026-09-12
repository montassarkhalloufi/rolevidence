import { test, expect } from "@playwright/test";

for (const width of [375, 1280]) {
  test(`responsive form, keyboard focus and empty state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
      if (route.request().url().endsWith("/bootstrap")) {
        await route.fulfill({
          json: {
            configured: false,
            model: "test",
            documents: {
              profile: "Profil fictif : TypeScript et Node.js.",
              job: "TypeScript requis.",
            },
          },
        });
      } else {
        await route.abort();
      }
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Analyser la correspondance/ }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Profil candidat · texte modifiable"),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    const focus = await page.locator(":focus").evaluate((element) => ({
      style: getComputedStyle(element).outlineStyle,
      width: getComputedStyle(element).outlineWidth,
    }));

    expect(focus.style).not.toBe("none");
    expect(parseFloat(focus.width)).toBeGreaterThan(0);
    await page.getByRole("button", { name: /Offre d’emploi/ }).click();
    await expect(
      page.getByLabel("Offre · collez la description du poste"),
    ).toHaveValue("TypeScript requis.");
    await page.getByLabel("Mode de travail souhaité").selectOption("hybrid");
    await expect(
      page.getByLabel("Télétravail minimum par semaine"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const input = page.getByLabel("Salaire minimum souhaité");

    expect(
      await input.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `test-results/design-system-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [375, 1280]) {
  test(`loading and verified results at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const profile =
      "Camille utilise TypeScript. " +
      "Description explicite de la pratique professionnelle. ".repeat(12);

    let analyses = 0;

    await page.route("http://127.0.0.1:5174/api/**", async (route) => {
      if (route.request().url().endsWith("/bootstrap")) {
        await route.fulfill({
          json: {
            configured: true,
            model: "test",
            documents: { profile, job: "TypeScript requis." },
          },
        });
      } else if (route.request().url().endsWith("/analyses")) {
        analyses++;
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          json: {
            analysis: {
              matches: [
                {
                  subject: "TypeScript",
                  explanation: "Pratique explicitement déclarée.",
                  interpretation: {
                    relation: "equivalence",
                    describedPractice: "TypeScript",
                    justification: "Déclaration explicite.",
                  },
                  evidenceState: "supported",
                  verification: null,
                  profileQuote: profile,
                  jobQuote: "TypeScript requis.",
                  preferencesQuote: null,
                },
              ],
              gaps: [],
              unknowns: [],
              needsReview: [],
            },
            metadata: {
              responseId: "fake-browser",
              model: "test",
              durationMs: 500,
              inputTokens: 10,
              outputTokens: 10,
            },
          },
        });
      } else {
        await route.abort();
      }
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: /Analyser la correspondance/ })
      .click();
    await expect(
      page.getByRole("button", { name: /Analyse en cours/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "TypeScript", exact: true }),
    ).toBeVisible();
    await expect(page.locator("blockquote").first()).toBeVisible();
    await expect(page.locator("blockquote").first()).toContainText(profile);
    expect(analyses).toBe(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/results-${width}.png`,
      fullPage: true,
    });
  });
}
