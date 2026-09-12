import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const scenarios = [
  {
    id: "clarified-java",
    profile: "Camille développe en JavaScript.",
    job: "Bonne pratique de Java requise.",
    clarifications:
      "[2026-09-12 · Déclaration du candidat] Je développe des services Java en production depuis 2020.",
    category: "matches" as const,
  },
  {
    id: "missing-rag",
    profile: "Riley développe des API et a suivi une introduction au RAG.",
    job: "Expérience de déploiement RAG en production exigée.",
    category: "unknowns" as const,
  },
  {
    id: "atomic-stack",
    profile:
      "Morgan développe des API Node.js avec TypeScript et PostgreSQL en production. Java n’est pas mentionné dans ce parcours.",
    job: "Bonne pratique de Java, TypeScript, Node.js et PostgreSQL.",
    category: "atomic" as const,
  },
];

const { providers } = configureProviders(loadConfig());

const directory = `artifacts/evaluations/release-${Date.now()}`;

await mkdir(directory, { recursive: true });
const observations: unknown[] = [];

let failures = 0;

for (let repetition = 0; repetition < 2; repetition++) {
  for (const scenario of scenarios) {
    const { id, category, ...documents } = scenario;

    const result = await providers.resolve().analyze(documents);

    const count = Object.values(result.analysis).flat().length;

    const passed =
      category === "atomic"
        ? count === 4 &&
          result.analysis.matches.length === 3 &&
          result.analysis.unknowns.length === 1
        : count === 1 &&
          result.analysis[category].length === 1 &&
          (id !== "clarified-java" ||
            result.analysis.matches.every(
              (finding) =>
                finding.profileQuote === null &&
                Boolean(finding.clarificationQuote) &&
                documents.clarifications?.includes(
                  finding.clarificationQuote ?? "",
                ),
            ));

    if (!passed) {
      failures++;
    }

    observations.push({ id, repetition, passed, result });
    await writeFile(
      `${directory}/observations.json`,
      JSON.stringify(observations, null, 2),
    );
    console.log(`${id} #${repetition + 1}: ${passed ? "PASS" : "FAIL"}`);
  }
}

console.log(directory);
process.exitCode = failures ? 1 : 0;
