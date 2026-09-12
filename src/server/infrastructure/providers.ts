import { LEGACY_OPENAI_MODEL } from "./config.ts";
import { createStructuredModel } from "./model-client.ts";
import { observeModel, createLangSmithSink } from "./telemetry.ts";
import { createLangChainGateway } from "../adapters/models/gateway.ts";
import { createAnalysisService } from "../application/analyze.ts";
import { createProviderRegistry } from "../application/provider-registry.ts";
import { createMessages } from "../adapters/openai/messages.ts";
import type { loadConfig } from "./config.ts";
import { createJobExtractor } from "../adapters/models/job-extraction.ts";

export function configureProviders(config: ReturnType<typeof loadConfig>) {
  // Disable SDK auto-tracing even if a parent shell enabled it. Only our
  // content-free, explicitly allowlisted telemetry may leave the process.
  delete process.env.LANGCHAIN_TRACING;
  process.env.LANGCHAIN_TRACING_V2 = "false";
  process.env.LANGSMITH_TRACING = "false";
  const sink =
    config.ROLEVIDENCE_TELEMETRY && config.LANGSMITH_API_KEY
      ? createLangSmithSink(config.LANGSMITH_API_KEY, config.LANGSMITH_PROJECT)
      : undefined;

  const invoke = observeModel(
    createStructuredModel({
      openai: config.OPENAI_API_KEY,
      anthropic: config.ANTHROPIC_API_KEY,
    }),
    sink,
  );

  const options = [
    ...[...new Set([config.OPENAI_MODEL, LEGACY_OPENAI_MODEL])].map(
      (model) => ({
        provider: "openai" as const,
        model,
        configured: Boolean(config.OPENAI_API_KEY),
      }),
    ),
    {
      provider: "anthropic" as const,
      model: config.ANTHROPIC_MODEL,
      configured: Boolean(config.ANTHROPIC_API_KEY),
    },
  ];

  const entries = options.map((option) => ({
    option,
    service: createAnalysisService(
      option.model,
      createLangChainGateway(option.provider, invoke),
      (documents, model) => ({
        provider: option.provider,
        model,
        messages: createMessages(documents),
        preparation:
          "Job-only relevance classification and canonical atomic criterion planning precede comparison. Equivalent criteria retain all original quotations; differing conditions are preserved with warnings. These are the complete source inputs before model preparation.",
      }),
    ),
  }));

  const providers = createProviderRegistry(entries);

  return {
    providers,
    extractOffer: createJobExtractor(invoke),
    fallback: entries[0]?.service,
  };
}
