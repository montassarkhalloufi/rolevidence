import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import type {
  AnalysisCheckpoint,
  AnalysisProgress,
} from "../src/server/application/execution.ts";
import { configureProviders } from "../src/server/infrastructure/providers.ts";
import { loadConfig } from "../src/server/infrastructure/config.ts";

const { providers } = configureProviders(loadConfig());

const service = providers.resolve();

const documents = {
  profile:
    "Camille développe des services TypeScript en production depuis 2020.",
  job: "Bonne pratique de TypeScript requise.",
};

const directory = `artifacts/evaluations/resume-${Date.now()}`;

await mkdir(directory, { recursive: true });
const controller = new AbortController();

const saved: { checkpoint: AnalysisCheckpoint | null } = { checkpoint: null };

const stages: AnalysisProgress[] = [];

let interrupted = false;

try {
  await service.analyze(documents, controller.signal, {
    checkpoint: null,
    onCheckpoint: (value) => {
      saved.checkpoint = value;
      controller.abort();
    },
    onProgress: (value) => stages.push(value),
  });
} catch {
  interrupted = true;
}

assert.ok(interrupted);
assert.deepEqual(
  saved.checkpoint?.responses.map((response) => response.name),
  ["job_passage_relevance"],
);
const firstResponseId = saved.checkpoint?.responses[0]?.metadata.responseId;

const result = await service.analyze(documents, undefined, {
  checkpoint: saved.checkpoint,
  onCheckpoint: (value) => {
    saved.checkpoint = value;
  },
  onProgress: (value) => stages.push(value),
});

const passed =
  saved.checkpoint?.responses.length === 2 &&
  saved.checkpoint.responses[0]?.metadata.responseId === firstResponseId &&
  result.analysis.matches.length === 1 &&
  result.analysis.needsReview.length === 0;

await writeFile(
  `${directory}/observation.json`,
  JSON.stringify(
    {
      documents,
      interrupted,
      passed,
      stages,
      checkpoint: saved.checkpoint,
      result,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    directory,
    interruptedAfterPreparation: interrupted,
    reusedPreparation:
      saved.checkpoint?.responses[0]?.metadata.responseId === firstResponseId,
    passed,
    metadata: result.metadata,
  }),
);
process.exitCode = passed ? 0 : 1;
