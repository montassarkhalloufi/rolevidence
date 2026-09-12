import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const config = loadConfig();

const { providers, extractOffer } = configureProviders(config);

const cases = [
  {
    id: "javascript-not-java",
    profile: "Camille développe des applications en JavaScript.",
    job: "Bonne pratique de Java requise.",
    category: "unknowns",
  },
  {
    id: "direct-typescript",
    profile:
      "Camille développe des API TypeScript en production depuis quatre ans.",
    job: "Bonne pratique de TypeScript requise.",
    category: "matches",
  },
  {
    id: "remote-hybrid",
    profile: "Camille développe des API.",
    job: "Télétravail : hybride.",
    category: "gaps",
    preferences: {
      minimumAnnualSalary: null,
      workMode: "remote" as const,
      remoteDaysPerWeek: null,
    },
  },
  {
    id: "salary-no-units",
    profile: "Camille développe des API.",
    job: "Salaire : 65000",
    category: "unknowns",
    preferences: {
      minimumAnnualSalary: 60000,
      workMode: null,
      remoteDaysPerWeek: null,
    },
  },
] as const;

const directory = `artifacts/evaluations/providers-${Date.now()}`;

await mkdir(directory, { recursive: true });
const observations: unknown[] = [];

let failures = 0;

for (const option of providers.options) {
  if (!option.configured) {
    console.log(`${option.provider}: not run (no key configured)`);
    continue;
  }

  const service = providers.resolve(option);

  for (const scenario of cases) {
    const { id, category, ...documents } = scenario;

    const result = await service.analyze(documents);

    const passed =
      result.analysis[category].length === 1 &&
      Object.values(result.analysis).flat().length === 1;

    if (!passed) {
      failures++;
    }

    observations.push({ provider: option.provider, id, passed, result });
    await writeFile(
      `${directory}/observations.json`,
      JSON.stringify(observations, null, 2),
    );
    console.log(
      `${option.provider} ${id}: ${passed ? "PASS" : "FAIL"} (${result.metadata.model})`,
    );
  }

  const source =
    "Intitulé : Développeur backend. Compétences : TypeScript et Node.js. Télétravail : hybride. Salaire : 65000. Entreprise : Société Exemple.";

  const result = await extractOffer(source, option);

  const passed =
    result.fields.length >= 3 &&
    result.fields.every((field) => source.includes(field.quote)) &&
    !result.fields.some(
      (field) => field.name === "salary" && /EUR|annuel|brut/.test(field.value),
    );

  if (!passed) {
    failures++;
  }

  observations.push({
    provider: option.provider,
    id: "job-extraction",
    passed,
    result,
  });
  await writeFile(
    `${directory}/observations.json`,
    JSON.stringify(observations, null, 2),
  );
  console.log(`${option.provider} job-extraction: ${passed ? "PASS" : "FAIL"}`);
}

console.log(`Saved ${directory}/observations.json`);
if (failures) {
  process.exitCode = 1;
}
