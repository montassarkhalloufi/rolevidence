import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirements } from "../src/server/domain/classify.ts";

await test("Omitted explicit conditions are evaluated from real source fields without another model call", () => {
  const quotes = [
    "Salaire : 50000 EUR brut annuel fixe.",
    "Télétravail : hybride.",
    "Expérience Kotlin requise.",
  ];

  const result = classifyRequirements(
    { requirements: [], unassessedJobQuotes: quotes },
    {
      profile: "Profil fictif",
      job: quotes.join("\n"),
      preferences: {
        minimumAnnualSalary: 60000,
        workMode: "remote",
        remoteDaysPerWeek: null,
      },
    },
  );

  assert.equal(result.gaps.length, 2);
  assert.equal(result.needsReview.length, 1);
  assert.equal(result.needsReview[0]?.jobQuote, quotes[2]);
  assert.equal(
    result.needsReview[0]?.verification?.code,
    "MISSING_REQUIREMENT_ANALYSIS",
  );
});

await test("Recovery never invents absent source fields", () => {
  const result = classifyRequirements(
    {
      requirements: [],
      unassessedJobQuotes: ["Salaire : 50000 EUR brut annuel fixe."],
    },
    {
      profile: "Fictif",
      job: "Kotlin requis.",
      preferences: {
        minimumAnnualSalary: 60000,
        workMode: null,
        remoteDaysPerWeek: null,
      },
    },
  );

  assert.equal(result.gaps.length, 0);
  assert.equal(result.needsReview.length, 1);
});
