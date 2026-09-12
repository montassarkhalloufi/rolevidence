import test from "node:test";
import assert from "node:assert/strict";
import type {
  DocumentsInput,
  Requirement,
} from "../src/server/domain/models.ts";
import { classifyRequirements } from "../src/server/domain/classify.ts";
import { preferencesText } from "../src/server/domain/preferences.ts";
import { isOpenSalaryMinimum } from "../src/server/domain/salary-minimum.ts";

const base: Requirement = {
  subject: "Formation",
  explanation: "Non précisé",
  candidateSource: "profile",
  candidateInformation: "provided",
  profileQuote: "Licence LMD achevée en informatique.",
  preferencesQuote: null,
  jobQuote: "Diplôme Bac+5 requis.",
  interpretation: {
    relation: "indirect_evidence",
    describedPractice: "Licence LMD",
    justification: "Diplôme présenté inférieur au niveau demandé.",
  },
  educationComparison: {
    candidateLevel: 3,
    requiredLevel: 5,
    basis: "recognized_qualification",
  },
};

const documents: DocumentsInput = {
  profile: base.profileQuote ?? "",
  job: base.jobQuote ?? "",
};

await test("a sourced interpreted education level yields a narrowly labelled declared qualification gap", () => {
  const result = classifyRequirements({ requirements: [base] }, documents);

  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0]?.assessment, "declared_education_gap");
  assert.match(
    result.gaps[0]?.interpretation.justification ?? "",
    /formation déclarée/,
  );
  assert.match(
    result.gaps[0]?.interpretation.justification ?? "",
    /équivalence/,
  );
});

await test("uncertain credentials, missing qualifications and technology facts cannot produce education gaps", () => {
  for (const requirement of [
    {
      ...base,
      educationComparison: {
        candidateLevel: 3,
        requiredLevel: 5,
        basis: "uncertain" as const,
      },
    },
    { ...base, candidateInformation: "not_provided" as const },
    { ...base, profileQuote: "Invented degree" },
    {
      ...base,
      profileQuote: "Camille utilise JavaScript.",
      jobQuote: "Java requis.",
    },
  ]) {
    const result = classifyRequirements(
      { requirements: [requirement] },
      {
        profile: documents.profile + "\nCamille utilise JavaScript.",
        job: documents.job + "\nJava requis.",
      },
    );

    assert.equal(result.gaps.length, 0);
  }
});

await test("open salary bounds explain possible compatibility without implying budget or units", () => {
  for (const job of [
    "Salaire : minimum 35000 EUR par an.",
    'baseSalary: {"currency":"EUR","value":{"minValue":35000,"unitText":"YEAR"}}',
  ]) {
    const result = classifyRequirements(
      { requirements: [{ ...base, educationComparison: null, jobQuote: job }] },
      {
        profile: documents.profile,
        job,
        preferences: {
          minimumAnnualSalary: 60000,
          workMode: null,
          remoteDaysPerWeek: null,
        },
      },
    );

    assert.equal(result.unknowns.length, 1);
    assert.equal(result.unknowns[0]?.assessment, "possible_compatibility");
    assert.match(
      result.unknowns[0]?.interpretation.justification ?? "",
      /pas un plafond/,
    );
  }

  for (const job of [
    'baseSalary: {"currency":"USD","value":{"minValue":35000,"unitText":"YEAR"}}',
    'baseSalary: {"currency":"EUR","value":{"minValue":70000,"maxValue":35000,"unitText":"YEAR"}}',
    "Salaire : minimum 70000 EUR par an, maximum 35000",
    "Salaire : minimum 35000 USD par an.",
  ]) {
    assert.equal(isOpenSalaryMinimum(job), false);
  }
});

await test("negotiable preferences do not become hard gaps; legacy constraints and quote ordering remain stable", () => {
  for (const workModePriority of [
    undefined,
    "required",
    "preferred",
  ] as const) {
    const preferences = {
      minimumAnnualSalary: 60000,
      salaryPriority: "preferred" as const,
      workMode: "hybrid" as const,
      remoteDaysPerWeek: 3,
      workModePriority,
    };

    const job = "Télétravail : présentiel.";

    const result = classifyRequirements(
      { requirements: [{ ...base, educationComparison: null, jobQuote: job }] },
      { profile: documents.profile, job, preferences },
    );

    assert.equal(result.gaps.length, workModePriority === "preferred" ? 0 : 1);
    assert.equal(result.needsReview.length, 0);
    if (workModePriority === "preferred") {
      assert.equal(result.unknowns[0]?.assessment, "negotiable_preference");
    }

    assert.match(
      preferencesText(preferences),
      /Priorité salaire : souhait négociable/,
    );
  }
});

await test("an unfinished course cannot be converted into an invented intermediate degree", () => {
  const profile = "Master en informatique en cours, diplôme non obtenu.";

  const result = classifyRequirements(
    {
      requirements: [
        {
          ...base,
          profileQuote: profile,
          educationComparison: {
            candidateLevel: 4,
            requiredLevel: 5,
            basis: "explicit_level",
          },
        },
      ],
    },
    { profile, job: documents.job },
  );

  assert.equal(result.gaps.length, 0);
  assert.equal(result.unknowns[0]?.educationComparison, null);
  assert.match(
    result.unknowns[0]?.interpretation.justification ?? "",
    /cursus en cours/,
  );
});
