import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const config = loadConfig();

const { providers } = configureProviders(config);

const selection = providers.options.find(
  (option) => option.provider === "openai" && option.configured,
);

if (!selection) {
  throw new Error("OpenAI is not configured; live evaluation not run.");
}

const service = providers.resolve(selection);

const directory = `artifacts/evaluations/source-integrity-${Date.now()}`;

await mkdir(directory, { recursive: true });
const scenarios: {
  id: string;
  profile: string;
  job: string;
  matches: number;
  unknowns: number;
  context: number;
  preferences?: {
    minimumAnnualSalary: number;
    workMode: "hybrid";
    remoteDaysPerWeek: number;
  };
  clarifications?: string;
  warnings?: number;
}[] = [
  {
    id: "accented-evidence-and-repeated-duty",
    profile:
      "Camille développe des services web.\nDéveloppement frontend React/TypeScript et backend Node.js/NestJS ; contribution à la Clean Architecture, aux revues de code et à l’optimisation des performances.",
    job: "Participer au développement de services web en React et Node.js.\nParticiper au développement de services web en React et Node.js.\nBonne pratique de Java exigée.",
    matches: 2,
    unknowns: 1,
    context: 0,
  },
  {
    id: "interview-logistics-versus-duty",
    profile:
      "Camille conduit les entretiens techniques des développeurs depuis deux ans.",
    job: "Vous rencontrerez notre recruteuse puis le manager pendant le processus de recrutement.\nVous conduirez les entretiens techniques des développeurs dans vos missions.",
    matches: 1,
    unknowns: 0,
    context: 1,
  },
  {
    id: "canonical-requirements-and-conflicting-metadata",
    profile:
      "Camille réside en France. Camille a six ans d’expérience en développement fullstack React et Node.js. Camille développe des services web en React et Node.js en production.",
    job: 'Développement de services web en React et Node.js.\nBonne pratique de Node.js.\nDiplôme d’ingénieur ou équivalent Bac+5 exigé.\nqualifications: Diplôme d’ingénieur ou équivalent de niveau Bac+5.\nAu moins 3 ans d’expérience en développement fullstack.\nexperienceRequirements: {"monthsOfExperience":12}\nRésidence en France exigée.\nLieu du poste : Nice, France.\njobLocationType: TELECOMMUTE\nSalaire : minimum 35000 EUR par an.',
    preferences: {
      minimumAnnualSalary: 60000,
      workMode: "hybrid",
      remoteDaysPerWeek: 3,
    },
    clarifications:
      "Déclaration du candidat : je suis ouvert aussi au présentiel.",
    matches: 5,
    unknowns: 4,
    context: 0,
    warnings: 1,
  },
  {
    id: "employer-brand-and-structured-salary-minimum",
    profile: "Camille développe des services Node.js en production.",
    job: 'Node.js requis.\nRejoindre Exemple, c’est choisir des formations internes, des projets variés et un environnement convivial soutenu par une certification de nos pratiques RH.\nbaseSalary: {"@type":"MonetaryAmount","currency":"EUR","value":{"minValue":35000,"unitText":"YEAR"}}',
    preferences: {
      minimumAnnualSalary: 60000,
      workMode: "hybrid",
      remoteDaysPerWeek: 3,
    },
    matches: 1,
    unknowns: 1,
    context: 1,
  },
  {
    id: "degree-level-is-one-qualified-criterion",
    profile: "Camille a six ans d’expérience en développement fullstack.",
    job: "Vous :Vous disposez d’un diplôme d’ingénieur ou équivalent (niveau Bac +5)Vous disposez d’au moins 3 ans d’expérience en développement fullstack.\nqualifications: Vous disposez d’un diplôme d’ingénieur ou équivalent (niveau Bac +5).\nVous disposez d’au moins 3 ans d’expérience en développement fullstack.",
    matches: 1,
    unknowns: 1,
    context: 0,
  },
];

const observations: unknown[] = [];

let failures = 0;

for (let repetition = 1; repetition <= 2; repetition++) {
  for (const scenario of scenarios.filter(
    (item) => !process.env.EVAL_FILTER || item.id === process.env.EVAL_FILTER,
  )) {
    try {
      const result = await service.analyze({
        profile: scenario.profile,
        job: scenario.job,
        preferences: scenario.preferences,
        clarifications: scenario.clarifications,
      });

      const passed =
        result.analysis.matches.length === scenario.matches &&
        result.analysis.unknowns.length === scenario.unknowns &&
        result.analysis.gaps.length === 0 &&
        result.analysis.needsReview.length === 0 &&
        result.metadata.contextPassages?.length === scenario.context &&
        (result.metadata.offerWarnings?.length ?? 0) >=
          (scenario.warnings ?? 0);

      failures += Number(!passed);
      observations.push({ id: scenario.id, repetition, passed, result });
      console.log(`${scenario.id} #${repetition}: ${passed ? "PASS" : "FAIL"}`);
    } catch (error) {
      failures++;
      observations.push({
        id: scenario.id,
        repetition,
        passed: false,
        error: String(error),
      });
      console.log(`${scenario.id} #${repetition}: ERROR`);
    }

    await writeFile(
      `${directory}/observations.json`,
      JSON.stringify(observations, null, 2),
    );
  }
}

console.log(
  `${observations.length - failures}/${observations.length} passed; ${directory}`,
);
process.exitCode = failures ? 1 : 0;
