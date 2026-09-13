import { createOpenAITransport } from "../src/server/infrastructure/openai-client.ts";
// Real paid model evaluation, separate from npm test. Fictional data only.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { passesEvaluation } from "./lib/evaluation.ts";
import { Preferences } from "../src/shared/analysis.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { createOpenAIGateway } from "../src/server/adapters/openai/gateway.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const regressionCases = [
  {
    id: "javascript-not-java",
    profile: "Développement d’interfaces web en JavaScript depuis 4 ans.",
    job: "Bonne pratique de Java requise.",
    expected: "insufficient_information",
  },
  {
    id: "nestjs-node",
    profile: "Développement et maintenance d’API avec NestJS.",
    job: "Bonne pratique de Node.js requise.",
    expected: "indirect_evidence",
  },
  {
    id: "java-training",
    profile: "Formation Java de 40 heures, exercices pédagogiques.",
    job: "Expérience de Java en production requise.",
    expected: "indirect_evidence",
  },
  {
    id: "ai-tests",
    profile: "Utilisation de Cursor pour générer des tests.",
    job: "Écriture et maintenance de tests d’intégration requises.",
    expected: "indirect_evidence",
  },
  {
    id: "direct-typescript",
    profile:
      "Développement et maintenance d’API TypeScript en production depuis 4 ans.",
    job: "Expérience de développement TypeScript en production requise.",
    expected: "equivalence",
  },
];

const suite = evaluationSuite();

function evaluationSuite() {
  if (process.argv.includes("--acceptance")) {
    return "acceptance";
  }

  return process.argv.includes("--held-out") ? "held-out" : "regression";
}

const EvaluationCase = z.object({
  id: z.string(),
  profile: z.string(),
  job: z.string(),
  preferences: Preferences.optional(),
  alternative: z
    .array(
      z.object({
        subjectPattern: z.string(),
        relation: z.enum([
          "equivalence",
          "contradiction",
          "indirect_evidence",
          "insufficient_information",
        ]),
      }),
    )
    .optional(),
  expected: z.enum([
    "equivalence",
    "indirect_evidence",
    "contradiction",
    "insufficient_information",
  ]),
});

const cases =
  suite !== "regression"
    ? z
        .array(EvaluationCase)
        .parse(
          JSON.parse(
            await readFile(
              new URL(`../data/evaluations/${suite}.json`, import.meta.url),
              "utf8",
            ),
          ),
        )
    : z.array(EvaluationCase).parse(regressionCases);

const config = loadConfig();

const service = createAnalysisService(
  config.OPENAI_MODEL,
  createOpenAIGateway(createOpenAITransport(config.OPENAI_API_KEY)),
);

const results = [];

for (const evaluation of cases) {
  const { id, profile, job, expected } = evaluation;

  const preferences =
    "preferences" in evaluation ? evaluation.preferences : undefined;

  const result = await service.analyze({ profile, job, preferences });

  const findings = Object.values(result.analysis).flat();

  const passed = passesEvaluation(
    result.analysis,
    expected,
    evaluation.alternative,
  );

  results.push({ id, profile, job, expected, passed, result });
  console.log(
    JSON.stringify({
      id,
      passed,
      actual: findings.map((f) => f.interpretation.relation),
      metadata: result.metadata,
    }),
  );
}

await mkdir(new URL("../artifacts/evaluations/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL(`../artifacts/evaluations/${suite}.json`, import.meta.url),
  JSON.stringify(
    {
      suite,
      kind: "real-provider-evaluation",
      evaluatedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  ) + "\n",
);
if (results.some((r) => !r.passed)) {
  process.exitCode = 1;
}
