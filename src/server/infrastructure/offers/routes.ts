import { RequestKey } from "../../../shared/request-key.ts";
import type { Express } from "express";
import { createHash } from "node:crypto";
import type { z } from "zod";
import { OfferImportInput } from "../../../shared/offer-imports.ts";
import { parseInput } from "../../adapters/http/input.ts";
import type { ProviderRegistry } from "../../application/provider-registry.ts";
import type { createJobExtractor } from "../../adapters/models/job-extraction.ts";
import { fetchPublicPage } from "./fetch-page.ts";
import { extractJobText } from "./html.ts";
import { createIdempotentAnalysis } from "../../application/idempotency.ts";
import { createMemoryAnalysisStore } from "../analysis-store.ts";

export function registerOfferRoutes(
  app: Express,
  providers: ProviderRegistry,
  extract: ReturnType<typeof createJobExtractor>,
) {
  async function importOffer(input: z.infer<typeof OfferImportInput>) {
    const page = await fetchPublicPage(input.url);

    const text = extractJobText(page.html);

    const result = await extract(text, input.selection);

    return {
      source: {
        url: page.url,
        text,
        retrievedAt: new Date().toISOString(),
        fields: result.fields,
      },
      metadata: result.metadata,
      rejectedFields: result.rejectedFields,
    };
  }

  const run = createIdempotentAnalysis(
    createMemoryAnalysisStore<Awaited<ReturnType<typeof importOffer>>>(),
  );

  app.post("/api/v1/offer-imports", async (req, res) => {
    const input = parseInput(OfferImportInput, req.body);

    const key = parseInput(RequestKey, req.get("Idempotency-Key"));

    providers.resolve(input.selection);

    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");

    const execution = run(key, hash, () => importOffer(input));

    res
      .set("Idempotency-Replayed", String(execution.replayed))
      .json(await execution.result);
  });
}
