import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkModes } from "../src/server/domain/work-mode.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import type {
  Requirement,
  PreferencesInput,
} from "../src/server/domain/models.ts";

function analyze(
  workMode: PreferencesInput["workMode"],
  job = "- Télétravail : hybride.",
  remoteDaysPerWeek: number | null = null,
) {
  const requirement: Requirement = {
    subject: "Télétravail",
    explanation: "Le CV ne confirme pas la capacité à s’adapter.",
    interpretation: {
      relation: "insufficient_information",
      describedPractice: null,
      justification: "Raisonnement erroné.",
    },
    candidateSource: "profile",
    candidateInformation: "not_provided",
    profileQuote: null,
    preferencesQuote: null,
    jobQuote: job,
  };

  return classifyRequirements(
    { requirements: [requirement] },
    {
      profile: "Profil fictif sans mode de travail.",
      job,
      preferences: { minimumAnnualSalary: 60000, workMode, remoteDaysPerWeek },
    },
  );
}

await test("Full remote preference versus explicit hybrid offer is a gap independent of CV and model uncertainty", () => {
  const result = analyze("remote");

  const finding = result.gaps[0];

  assert.equal(result.gaps.length, 1);
  assert.equal(finding?.profileQuote, null);
  assert.equal(
    finding?.preferencesQuote,
    "Mode de travail : 100 % télétravail.",
  );
  assert.equal(finding?.interpretation.relation, "contradiction");
  assert.doesNotMatch(finding?.interpretation.justification ?? "", /CV|adapt/);
  assert.equal(finding?.verification, null);
});

await test("Explicit modes compare all pairs, while missing preferences and unspecified hybrid days stay unknown", () => {
  const labels = {
    onsite: "présentiel",
    hybrid: "hybride",
    remote: "100 % télétravail",
  };

  for (const desired of ["onsite", "hybrid", "remote"] as const) {
    for (const offered of ["onsite", "hybrid", "remote"] as const) {
      const result = analyze(desired, `Mode de travail : ${labels[offered]}`);

      assert.equal(result.matches.length, Number(desired === offered));
      assert.equal(result.gaps.length, Number(desired !== offered));
    }
  }

  assert.equal(analyze(null).unknowns.length, 1);
  assert.equal(
    analyze("hybrid", "Télétravail : hybride", 3).unknowns.length,
    1,
  );
});

await test("Negation, alternatives and conditional offers are never interpreted by keyword matching", () => {
  for (const job of [
    "Télétravail : pas hybride.",
    "Télétravail : hybride ou full remote.",
    "Télétravail : hybride après accord.",
  ]) {
    const result = analyze("remote", job);

    assert.equal(result.gaps.length, 0);
    assert.equal(result.unknowns.length, 1);
  }
});

await test("Repeated interpretations of the same explicit work field produce one condition", () => {
  const job = "Télétravail : hybride.";

  const requirement: Requirement = {
    subject: "Mode",
    explanation: "Proposé",
    interpretation: {
      relation: "insufficient_information",
      describedPractice: null,
      justification: "Proposé",
    },
    candidateSource: "profile",
    candidateInformation: "not_provided",
    profileQuote: null,
    preferencesQuote: null,
    jobQuote: job,
  };

  const documents = {
    profile: "Fictif",
    job,
    preferences: {
      minimumAnnualSalary: null,
      workMode: "remote" as const,
      remoteDaysPerWeek: null,
    },
  };

  const requirements = [
    requirement,
    { ...requirement, subject: "Préférence remote" },
  ];

  assert.equal(normalizeWorkModes(requirements, documents).length, 1);
  assert.equal(
    classifyRequirements({ requirements }, documents).gaps.length,
    1,
  );
});

await test("Explicit remote choice and hybrid day ceiling are compared without inferring flexibility", () => {
  assert.equal(
    analyze(
      "remote",
      "Mode de travail : hybride ou 100 % télétravail au choix du candidat.",
    ).matches.length,
    1,
  );
  assert.equal(
    analyze(
      "hybrid",
      "Télétravail : hybride, 2 jours de télétravail par semaine maximum.",
      3,
    ).gaps.length,
    1,
  );
  assert.equal(
    analyze(
      "hybrid",
      "Télétravail : hybride, 3 jours de télétravail par semaine maximum.",
      3,
    ).matches.length,
    1,
  );
});
