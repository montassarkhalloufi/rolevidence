import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { AnalysisResponse } from "../src/shared/analysis.ts";
import {
  API_PATHS,
  IDEMPOTENCY_HEADER,
  LOCAL_CLIENT_HEADER,
  LOCAL_CLIENT_VALUE,
} from "../src/shared/api-config.ts";

const url = `http://127.0.0.1:3001${API_PATHS.analyses}`;

const documents = {
  profile: "Maintenance de services TypeScript en production.",
  job: "TypeScript en production requis.",
};

const key = randomUUID();

const headers = {
  "Content-Type": "application/json",
  [LOCAL_CLIENT_HEADER]: LOCAL_CLIENT_VALUE,
  [IDEMPOTENCY_HEADER]: key,
};

const observations: {
  name: string;
  status: number;
  requestId: string | null;
  replay: string | null;
}[] = [];

async function post(name: string, body: unknown, requestHeaders = headers) {
  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75000),
  });

  observations.push({
    name,
    status: response.status,
    requestId: response.headers.get("x-request-id"),
    replay: response.headers.get("idempotency-replayed"),
  });

  return response;
}

const first = await post("initial-real-call", documents);

assert.equal(first.status, 200);
const result = AnalysisResponse.parse(await first.json());

const replay = await post("same-key-replay", documents);

assert.equal(replay.status, 200);
assert.deepEqual(AnalysisResponse.parse(await replay.json()), result);
assert.equal(replay.headers.get("idempotency-replayed"), "true");
const conflict = await post("same-key-different-input", {
  ...documents,
  job: "Java requis.",
});

assert.equal(conflict.status, 409);
const invalid = await post(
  "invalid-input",
  { profile: "", job: "" },
  { ...headers, [IDEMPOTENCY_HEADER]: randomUUID() },
);

assert.equal(invalid.status, 400);
const unguarded = await post("missing-local-header", documents, {
  ...headers,
  [LOCAL_CLIENT_HEADER]: "",
});

assert.equal(unguarded.status, 403);
await mkdir(new URL("../artifacts/evaluations/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL(
    `../artifacts/evaluations/api-contract-${Date.now()}.json`,
    import.meta.url,
  ),
  JSON.stringify(
    {
      kind: "real-api-contract-check",
      responseId: result.metadata.responseId,
      observations,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ passed: true, observations }));
