import { createAnalysisRequest } from "../src/server/adapters/openai/request.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createApp } from "../src/server/infrastructure/http/app.ts";
import { createAnalysisService } from "../src/server/application/analyze.ts";
import { AppError } from "../src/server/application/errors.ts";
import { extractCv } from "../src/server/infrastructure/documents/extract.ts";

const documents = {
  profile: "Camille utilise TypeScript.",
  job: "TypeScript requis.",
};

const result = {
  analysis: { matches: [], gaps: [], unknowns: [], needsReview: [] },
  metadata: {
    responseId: "mock-test",
    model: "mock",
    durationMs: 1,
    inputTokens: 0,
    outputTokens: 0,
  },
};

const headers = { "Content-Type": "application/json", "X-Rolevidence": "1" };

await test("HTTP : validation, contexte sans appel LLM, résultat et erreurs sans secret (gateway simulée)", async (t) => {
  let calls = 0;

  const service = createAnalysisService(
    "mock",
    async () => {
      calls++;

      return { extraction: { requirements: [] }, metadata: result.metadata };
    },
    createAnalysisRequest,
  );

  const server = createApp({
    service,
    readDocuments: async () => documents,
    model: "mock",
    configured: true,
  }).listen(0, "127.0.0.1");

  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();

  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;

  const post = (path: string, body: unknown) =>
    fetch(base + path, {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    });

  assert.equal(
    (await post("/api/v1/analyses", { profile: "", job: "x" })).status,
    400,
  );
  assert.equal(
    (await post("/api/v1/analyses", { ...documents, apiKey: "never-accepted" }))
      .status,
    400,
  );
  assert.equal(calls, 0);
  const preview = await post("/api/v1/analysis-context", documents);

  assert.equal(preview.status, 200);
  assert.equal(calls, 0);
  const context = await preview.json();

  assert.equal(context.input[1].content.includes(documents.profile), true);
  assert.equal(context.store, false);
  assert.deepEqual(
    await (await post("/api/v1/analyses", documents)).json(),
    result,
  );
  assert.equal(calls, 1);
  assert.equal(
    (
      await fetch(base + "/api/v1/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documents),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/v1/analyses", {
        method: "POST",
        headers,
        body: "{broken",
      })
    ).status,
    400,
  );
  const form = new FormData();

  form.append("cv", new Blob(["Camille TypeScript"]), "cv.txt");
  const imported = await fetch(base + "/api/v1/resume-extractions", {
    method: "POST",
    headers: { "X-Rolevidence": "1" },
    body: form,
  });

  assert.equal(imported.status, 200);
  assert.deepEqual(await imported.json(), { text: "Camille TypeScript" });
  assert.equal(calls, 1);
  service.analyze = async () => {
    throw new Error("SECRET_PROVIDER_TOKEN");
  };

  const error = await post("/api/v1/analyses", documents);

  assert.equal(error.status, 500);
  assert.equal((await error.text()).includes("SECRET_PROVIDER_TOKEN"), false);
  service.analyze = async () => {
    throw new AppError("CONNECTION", "Réseau indisponible.");
  };

  assert.equal((await post("/api/v1/analyses", documents)).status, 502);
});

for (const extension of ["txt", "pdf", "docx"]) {
  await test(`Extraction réelle locale du CV fictif ${extension}, sans modèle`, async () => {
    const buffer = await readFile(
      new URL(`./fixtures/cv.${extension}`, import.meta.url),
    );

    assert.match(await extractCv(buffer, `cv.${extension}`), /Camille/);
    assert.match(await extractCv(buffer, `cv.${extension}`), /TypeScript/);
  });
}

await test("Import : format interdit, faux PDF, PDF vide et dépassement de taille rejetés", async () => {
  await assert.rejects(
    extractCv(Buffer.from("x"), "cv.exe"),
    /Formats acceptés/,
  );
  await assert.rejects(
    extractCv(Buffer.from("not a pdf"), "cv.pdf"),
    /PDF valide/,
  );
  await assert.rejects(
    extractCv(
      await readFile(new URL("./fixtures/empty.pdf", import.meta.url)),
      "cv.pdf",
    ),
    /Aucun texte extrait/,
  );
  await assert.rejects(
    extractCv(Buffer.alloc(5 * 1024 * 1024 + 1), "cv.txt"),
    /5 Mo/,
  );
  await assert.rejects(
    extractCv(Buffer.from("x".repeat(16001)), "cv.txt"),
    /16 000/,
  );
});
