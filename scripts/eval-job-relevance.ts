import { mkdir, writeFile } from "node:fs/promises";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";
import { fetchPublicPage } from "../src/server/infrastructure/offers/fetch-page.ts";
import { extractJobText } from "../src/server/infrastructure/offers/html.ts";

const url = process.argv[2];

if (!url) {
  throw new Error(
    "Pass a public job URL. This performs one paid analysis with a fictional profile.",
  );
}

const page = await fetchPublicPage(url);

const job = extractJobText(page.html);

const { providers } = configureProviders(loadConfig());

const result = await providers.resolve().analyze({
  profile:
    "Camille développe des applications React et TypeScript en production depuis 6 ans. Camille développe des API Node.js et NestJS avec PostgreSQL. Camille écrit des tests unitaires et d’intégration avec Jest. Camille utilise Git, Docker et des pipelines CI/CD. Camille participe aux revues de code et aux cérémonies Agile. Anglais professionnel lu, écrit et parlé. Français courant. Licence informatique. Camille utilise Claude pour assister le développement et vérifie le code généré.",
  job,
});

const directory = `artifacts/evaluations/job-relevance-${Date.now()}`;

await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/result.json`,
  JSON.stringify({ url: page.url, job, result }, null, 2),
);
console.log(
  JSON.stringify(
    {
      directory,
      jobCharacters: job.length,
      counts: Object.fromEntries(
        Object.entries(result.analysis).map(([key, value]) => [
          key,
          value.length,
        ]),
      ),
      contexts: result.metadata.contextPassages?.length,
      remaining: result.analysis.needsReview
        .filter(
          (item) => item.verification?.code === "MISSING_REQUIREMENT_ANALYSIS",
        )
        .map((item) => item.jobQuote),
      subjects: Object.values(result.analysis)
        .flat()
        .map((item) => item.subject),
      metadata: {
        model: result.metadata.model,
        durationMs: result.metadata.durationMs,
        inputTokens: result.metadata.inputTokens,
        outputTokens: result.metadata.outputTokens,
      },
    },
    null,
    2,
  ),
);
