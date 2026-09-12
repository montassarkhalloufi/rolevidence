import test from "node:test";
import assert from "node:assert/strict";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type {
  DocumentsInput,
  Requirement,
} from "../src/server/domain/models.ts";

function analyze(profile: string, job: string, salary = false) {
  const documents: DocumentsInput = {
    profile,
    job,
    preferences: {
      minimumAnnualSalary: 60000,
      workMode: null,
      remoteDaysPerWeek: null,
    },
  };

  const requirement: Requirement = {
    subject: salary ? "Salaire" : "Durée backend",
    explanation: "Conclusion affirmative erronée.",
    interpretation: {
      relation: "equivalence",
      describedPractice: "Preuve proposée",
      justification: "Le modèle affirme la compatibilité.",
    },
    candidateSource: "profile",
    candidateInformation: "provided",
    profileQuote: profile,
    preferencesQuote: null,
    jobQuote: job,
    experienceComparison: salary
      ? null
      : { comparableScope: true, candidateDuration: "exact" },
  };

  return classifyRequirements({ requirements: [requirement] }, documents);
}

await test("Ambiguous salary units, net/monthly pay and bonus totals cannot validate an annual gross fixed minimum", () => {
  for (const job of [
    "Salaire : 65000",
    "Salaire : 65000 USD brut annuel fixe",
    "Salaire : 65000 EUR net annuel fixe",
    "Salaire : 65000 EUR brut mensuel fixe",
    "Salaire : 50000 EUR brut annuel fixe + 20000 EUR bonus",
    "Salaire : 70000-50000 EUR brut annuel fixe",
    "Salaire : non communiqué.",
  ]) {
    const result = analyze("Profil fictif", job, true);

    assert.equal(result.matches.length, 0, job);
    assert.equal(result.unknowns.length, 1, job);
    assert.doesNotMatch(result.unknowns[0]?.explanation ?? "", /affirmative/);
    assert.equal(result.unknowns[0]?.profileQuote, null);
  }
});

await test("Salary fixed amounts and ranges are compared numerically, without a promised offer", () => {
  for (const [amount, expected] of [
    ["55 000", "gaps"],
    ["50 000 à 59 000", "gaps"],
    ["50 000-65 000", "matches"],
    ["60 000", "matches"],
  ] as const) {
    const result = analyze(
      "Profil fictif",
      `Salaire : ${amount} EUR brut annuel fixe, hors bonus.`,
      true,
    );

    assert.equal(result[expected].length, 1, amount);
    assert.equal(
      result[expected][0]?.preferencesQuote,
      "Salaire minimum : 60000 EUR brut annuel fixe, hors bonus.",
    );
  }
});

await test("Fullstack duration, job periods and negations cannot establish backend duration even with dishonest model metadata", () => {
  for (const profile of [
    "9+ ans d’expérience fullstack.",
    "2017–2023 : Node.js, React.",
    "Je n’ai pas 6 ans backend.",
    "6 ans frontend, une année backend.",
  ]) {
    const result = analyze(profile, "- Au moins 4 ans d'expérience backend.");

    assert.equal(result.matches.length, 0, profile);
    assert.equal(result.unknowns.length, 1, profile);
    assert.equal(
      result.unknowns[0]?.interpretation.relation,
      "insufficient_information",
    );
  }
});

await test("Exact backend durations and lower bounds produce different conclusions", () => {
  for (const [profile, minimum, expected] of [
    ["6 ans backend.", 4, "matches"],
    ["6 ans backend.", 12, "gaps"],
    ["9+ ans backend.", 12, "unknowns"],
    ["Au moins 9 ans backend.", 4, "matches"],
  ] as const) {
    const result = analyze(profile, `Au moins ${minimum} ans backend.`);

    assert.equal(result[expected].length, 1, profile);
  }
});

await test("backend-only arithmetic does not reclassify a fullstack requirement as backend", () => {
  const result = analyze(
    "6 ans d’expérience fullstack.",
    "Au moins 3 ans d’expérience en développement fullstack.",
  );

  assert.equal(result.matches.length, 1);
  assert.doesNotMatch(
    result.matches[0]?.interpretation.justification ?? "",
    /durée backend/,
  );
});

await test("JSON-LD salary minima cannot become a ceiling or imply a gross fixed basis", () => {
  for (const job of [
    'baseSalary: {"currency":"EUR","value":{"minValue":35000,"unitText":"YEAR"}}',
    'baseSalary: {"currency":"EUR","value":{"minValue":35000,"maxValue":70000,"unitText":"YEAR"}}',
  ]) {
    const result = analyze("Profil fictif", job, true);

    assert.equal(result.gaps.length, 0);
    assert.equal(result.matches.length, 0);
    assert.equal(result.unknowns.length, 1);
    assert.equal(result.unknowns[0]?.profileQuote, null);
  }
});
