import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";
import type {
  DocumentsInput,
  AnalysisResult,
  Finding,
} from "../src/server/domain/models.ts";

const { providers } = configureProviders(loadConfig());

const service = providers.resolve();

const scenarios: {
  id: string;
  documents: DocumentsInput;
  category: keyof AnalysisResult;
  assessment?: Finding["assessment"];
}[] = [
  {
    id: "licence-versus-bac5",
    documents: {
      profile:
        "Camille : Licence LMD en informatique obtenue à Tunis en 2015, après trois années d’études après le baccalauréat.",
      job: "Diplôme d’ingénieur ou équivalent de niveau Bac+5 exigé.",
    },
    category: "gaps",
    assessment: "declared_education_gap",
  },
  {
    id: "incomplete-master",
    documents: {
      profile:
        "Camille suit actuellement un Master en informatique ; diplôme non obtenu. Aucun diplôme achevé n’est précisé.",
      job: "Master en informatique obtenu exigé.",
    },
    category: "unknowns",
  },
  {
    id: "highest-completed-degree",
    documents: {
      profile:
        "Camille : Licence en informatique obtenue en 2017. Master en informatique obtenu en 2019, niveau Bac+5.",
      job: "Diplôme de niveau Bac+5 exigé.",
    },
    category: "matches",
  },
  {
    id: "javascript-not-education",
    documents: {
      profile: "Camille pratique JavaScript en production.",
      job: "Bonne pratique de Java exigée.",
    },
    category: "unknowns",
  },
  {
    id: "open-salary-minimum",
    documents: {
      profile: "Camille développe des applications.",
      job: 'baseSalary: {"currency":"EUR","value":{"minValue":35000,"unitText":"YEAR"}}',
      preferences: {
        minimumAnnualSalary: 60000,
        workMode: null,
        remoteDaysPerWeek: null,
      },
    },
    category: "unknowns",
    assessment: "possible_compatibility",
  },
  {
    id: "negotiable-salary",
    documents: {
      profile: "Camille développe des applications.",
      job: "Salaire : 55000 EUR brut annuel fixe, hors bonus.",
      preferences: {
        minimumAnnualSalary: 60000,
        salaryPriority: "preferred",
        workMode: null,
        remoteDaysPerWeek: null,
      },
    },
    category: "unknowns",
    assessment: "negotiable_preference",
  },
  {
    id: "negotiable-work-mode",
    documents: {
      profile: "Camille développe des applications.",
      job: "Télétravail : présentiel.",
      preferences: {
        minimumAnnualSalary: null,
        workMode: "hybrid",
        remoteDaysPerWeek: 3,
        workModePriority: "preferred",
      },
    },
    category: "unknowns",
    assessment: "negotiable_preference",
  },
  {
    id: "required-work-mode",
    documents: {
      profile: "Camille développe des applications.",
      job: "Télétravail : présentiel.",
      preferences: {
        minimumAnnualSalary: null,
        workMode: "hybrid",
        remoteDaysPerWeek: 3,
        workModePriority: "required",
      },
    },
    category: "gaps",
  },
];

const directory = `artifacts/evaluations/qualified-conclusions-${Date.now()}`;

await mkdir(directory, { recursive: true });
const observations: unknown[] = [];

let failures = 0;

for (const scenario of scenarios) {
  try {
    const result = await service.analyze(scenario.documents);

    const items = result.analysis[scenario.category];

    const passed =
      items.length === 1 &&
      Object.values(result.analysis).flat().length === 1 &&
      (!scenario.assessment || items[0]?.assessment === scenario.assessment);

    observations.push({ id: scenario.id, passed, result });
    failures += Number(!passed);
    console.log(`${scenario.id}: ${passed ? "PASS" : "FAIL"}`);
  } catch (error) {
    failures++;
    observations.push({ id: scenario.id, passed: false, error: String(error) });
    console.log(`${scenario.id}: ERROR`);
  }

  await writeFile(
    `${directory}/observations.json`,
    JSON.stringify(observations, null, 2),
  );
}

console.log(
  `${scenarios.length - failures}/${scenarios.length} passed; ${directory}`,
);
process.exitCode = failures ? 1 : 0;
