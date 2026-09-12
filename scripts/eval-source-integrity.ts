import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const { providers } = configureProviders(loadConfig());

const selection = providers.options.find(
  (option) => option.provider === "openai" && option.configured,
);

if (!selection) {
  throw new Error("OpenAI is not configured; live evaluation not run.");
}

const service = providers.resolve(selection);

const directory = `artifacts/evaluations/source-integrity-${Date.now()}`;

await mkdir(directory, { recursive: true });
const scenarios = [
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
];

const observations: unknown[] = [];

let failures = 0;

for (let repetition = 1; repetition <= 2; repetition++) {
  for (const scenario of scenarios) {
    try {
      const result = await service.analyze({
        profile: scenario.profile,
        job: scenario.job,
      });

      const passed =
        result.analysis.matches.length === scenario.matches &&
        result.analysis.unknowns.length === scenario.unknowns &&
        result.analysis.gaps.length === 0 &&
        result.analysis.needsReview.length === 0 &&
        result.metadata.contextPassages?.length === scenario.context;

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
