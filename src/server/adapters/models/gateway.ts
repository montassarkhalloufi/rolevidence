import { planCriteria, PLAN_VERSION } from "./criterion-plan.ts";
import { checkpointInvoker } from "./checkpoint-invoker.ts";
import { createJobRelevance, RELEVANCE_VERSION } from "./job-relevance.ts";
import type { ModelGateway } from "../../application/analyze.ts";
import type { Selection } from "../../application/dossiers.ts";
import type { StructuredModel } from "./structured.ts";
import { compareComplete, COMPARISON_VERSION } from "./complete-comparison.ts";
import { createSourceCatalog } from "../openai/sources.ts";
import { SCHEMA_VERSION } from "../openai/request.ts";

export function createLangChainGateway(
  provider: Selection["provider"],
  invoke: StructuredModel,
): ModelGateway {
  return async ({ documents, model }, signal, execution) => {
    const resumeInvoke = checkpointInvoker(invoke, execution, signal);

    execution?.onProgress({ stage: "preparation", completed: 0, total: 2 });
    const catalog = createSourceCatalog(documents);

    const relevance = await createJobRelevance(resumeInvoke)(
      catalog.job,
      { provider, model },
      signal,
    );

    const retained = new Set(relevance.passages.map((passage) => passage.id));

    const reviewed = new Set(documents.reviewedJobQuotes ?? []);

    const selectedCatalog = {
      ...catalog,
      job: catalog.job.filter(
        (passage) => retained.has(passage.id) || reviewed.has(passage.text),
      ),
    };

    execution?.onProgress({ stage: "preparation", completed: 1, total: 2 });
    const plan = await planCriteria(
      resumeInvoke,
      selectedCatalog.job,
      { provider, model },
      signal,
    );

    const comparison = await compareComplete(
      resumeInvoke,
      documents,
      { ...selectedCatalog, job: plan.passages },
      { provider, model },
      signal,
      execution?.onProgress,
    );

    const stages = [
      relevance.metadata,
      ...plan.metadata,
      ...comparison.metadata,
    ];

    const metadata = stages.at(-1) ?? relevance.metadata;

    const extraction = comparison.extraction;

    return {
      extraction,
      metadata: {
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        contextPassages: relevance.contextPassages.filter(
          (passage) => !reviewed.has(passage.quote),
        ),
        preparationVersion: `${RELEVANCE_VERSION}/${PLAN_VERSION}`,
        offerWarnings: plan.warnings,
        promptVersion: COMPARISON_VERSION,
        durationMs: stages.reduce((sum, stage) => sum + stage.durationMs, 0),
        inputTokens: stages.reduce<number | null>(
          (sum, stage) => addTokens(sum, stage.inputTokens),
          0,
        ),
        outputTokens: stages.reduce<number | null>(
          (sum, stage) => addTokens(sum, stage.outputTokens),
          0,
        ),
      },
    };
  };
}

function addTokens(first: number | null, second: number | null) {
  return first === null || second === null ? null : first + second;
}
