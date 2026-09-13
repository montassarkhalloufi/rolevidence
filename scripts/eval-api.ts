import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Documents, AnalysisResponse } from "../src/shared/analysis.ts";
import {
  API_PATHS,
  IDEMPOTENCY_HEADER,
  LOCAL_CLIENT_HEADER,
  LOCAL_CLIENT_VALUE,
} from "../src/shared/api-config.ts";
import { assess } from "./lib/http-assessment.ts";
import { ModelSelection } from "../src/shared/providers.ts";

const selection =
  process.env.EVAL_PROVIDER || process.env.EVAL_MODEL
    ? ModelSelection.parse({
        provider: process.env.EVAL_PROVIDER,
        model: process.env.EVAL_MODEL,
      })
    : undefined;

const expectation = z.object({
  subjectPattern: z.string(),
  category: z.enum(["matches", "gaps", "unknowns"]),
});

const scenarioSchema = Documents.extend({
  id: z.string(),
  expected: z.array(expectation),
});

const suite = z
  .enum(["stress", "adversarial"])
  .parse(process.env.EVAL_SUITE ?? "stress");

const scenarios = z
  .array(scenarioSchema)
  .parse(
    JSON.parse(
      await readFile(
        new URL(`../data/evaluations/${suite}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

const repetitions = z.coerce
  .number()
  .int()
  .min(1)
  .max(5)
  .parse(process.env.EVAL_REPETITIONS ?? 2);

const selected = scenarios.filter(
  (scenario) =>
    !process.env.EVAL_FILTER || scenario.id.includes(process.env.EVAL_FILTER),
);

const directory = new URL(
  `../artifacts/evaluations/api-${Date.now()}/`,
  import.meta.url,
);

const observations: unknown[] = [];

let failures = 0;

await mkdir(directory, { recursive: true });
console.log(
  JSON.stringify({
    directory: directory.pathname,
    scenarios: selected.length,
    repetitions,
    selection,
  }),
);

for (const scenario of selected) {
  for (let iteration = 1; iteration <= repetitions; iteration++) {
    const { id, expected, ...documents } = scenario;

    const started = performance.now();

    try {
      const response = await fetch(
        `http://127.0.0.1:3001${API_PATHS.analyses}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [LOCAL_CLIENT_HEADER]: LOCAL_CLIENT_VALUE,
            [IDEMPOTENCY_HEADER]: randomUUID(),
          },
          body: JSON.stringify({
            ...documents,
            ...(selection ? { selection } : {}),
          }),
          signal: AbortSignal.timeout(75000),
        },
      );

      const body: unknown = await response.json();

      const parsed = AnalysisResponse.safeParse(body);

      if (!response.ok || !parsed.success) {
        throw new Error(`HTTP ${response.status}; schema=${parsed.success}`);
      }

      const assessment = assess(parsed.data.analysis, expected, documents);

      if (!assessment.passed) {
        failures++;
      }

      observations.push({
        id,
        iteration,
        expected,
        documents,
        assessment,
        status: response.status,
        requestId: response.headers.get("x-request-id"),
        elapsedMs: Math.round(performance.now() - started),
        result: parsed.data,
      });
      console.log(
        JSON.stringify({
          id,
          iteration,
          passed: assessment.passed,
          errors: assessment.errors,
          metadata: parsed.data.metadata,
        }),
      );
    } catch (error) {
      failures++;
      const detail =
        error instanceof Error ? error.message : "Unknown evaluation error";

      observations.push({ id, iteration, error: detail });
      console.log(JSON.stringify({ id, iteration, error: detail }));
    }

    await writeFile(
      new URL("observations.json", directory),
      JSON.stringify(
        {
          kind: "real-http-provider-evaluation",
          repetitions,
          selection,
          failures,
          observations,
        },
        null,
        2,
      ),
    );
  }
}

if (failures) {
  process.exitCode = 1;
}
