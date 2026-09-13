import { relevanceInstructions } from "./prompts/job-relevance.ts";
import { z } from "zod";
import type { StructuredModel } from "./structured.ts";
import type { Selection } from "../../application/case-files.ts";
import type { SourcePassage } from "./sources.ts";

export const RELEVANCE_VERSION = "job-relevance-v3-employer-context";

export function createJobRelevance(invoke: StructuredModel) {
  return async (
    passages: SourcePassage[],
    selection: Selection,
    signal?: AbortSignal,
  ) => {
    const [first, ...rest] = passages.map((item) => item.id);

    const schema = z
      .object({
        passages: z.array(
          z
            .object({
              id: first ? z.enum([first, ...rest]) : z.string(),
              kind: z.enum([
                "candidate_criterion",
                "job_condition",
                "heading",
                "company_background",
                "publication_metadata",
                "recruitment_process",
              ]),
            })
            .strict(),
        ),
      })
      .strict();

    const result = await invoke(
      {
        selection,
        schema,
        name: "job_passage_relevance",
        promptVersion: RELEVANCE_VERSION,
        messages: [
          {
            role: "system",
            content: relevanceInstructions,
          },
          { role: "user", content: JSON.stringify({ passages }) },
        ],
      },
      signal,
    );

    const parsed = schema.parse(result.value);

    const contextual = passages.flatMap((passage) => {
      const decisions = parsed.passages.filter(
        (item) => item.id === passage.id,
      );

      const decision = decisions[0];

      if (
        decisions.length !== 1 ||
        !decision ||
        ["candidate_criterion", "job_condition"].includes(decision.kind)
      ) {
        return [];
      }

      return [{ id: passage.id, quote: passage.text, reason: decision.kind }];
    });

    const excluded = new Set(contextual.map((item) => item.id));

    return {
      passages: passages.filter((item) => !excluded.has(item.id)),
      contextPassages: contextual.map(({ quote, reason }) => ({
        quote,
        reason,
      })),
      metadata: result.metadata,
    };
  };
}
