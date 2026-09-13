import { criterionPlanInstructions } from "./prompts/criterion-plan.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import { z } from "zod";
import type { StructuredModel } from "./structured.ts";
import type { Selection } from "../../application/case-files.ts";
import type { SourcePassage } from "./sources.ts";
import { AppError } from "../../application/errors.ts";

export const PLAN_VERSION = "atomic-criteria-v3-qualified-atoms";

const MAX_CRITERIA = 128;

export async function planCriteria(
  invoke: StructuredModel,
  passages: SourcePassage[],
  selection: Selection,
  signal?: AbortSignal,
) {
  if (passages.length < 2) {
    return { passages, warnings: [], metadata: [] };
  }

  const ids = passages.map(({ id }) => id);

  const [first, ...rest] = ids;

  if (!first) {
    throw new AppError("INVALID_INPUT", errorMessages.missingCriteria);
  }

  const reference = z.enum([first, ...rest]);

  const schema = z
    .object({
      criteria: z
        .array(
          z
            .object({
              subject: z.string(),
              sourceIds: z.array(reference).min(1),
            })
            .strict(),
        )
        .min(1)
        .max(MAX_CRITERIA),
      warnings: z.array(
        z
          .object({
            explanation: z.string(),
            sourceIds: z.array(reference).min(2),
          })
          .strict(),
      ),
    })
    .strict();

  const response = await invoke(
    {
      name: "atomic_job_criteria",
      promptVersion: PLAN_VERSION,
      schema,
      selection,
      messages: [
        {
          role: "system",
          content: criterionPlanInstructions,
        },
        { role: "user", content: JSON.stringify({ passages }) },
      ],
    },
    signal,
  );

  const plan = schema.parse(response.value);

  const covered = new Set(plan.criteria.flatMap(({ sourceIds }) => sourceIds));

  if (ids.some((id) => !covered.has(id))) {
    throw new AppError("INVALID_OUTPUT", errorMessages.incompleteCriterionPlan);
  }

  const source = new Map(passages.map((item) => [item.id, item.text]));

  const quotes = (references: string[]) => [
    ...new Set(references.map((id) => source.get(id) ?? "")),
  ];

  return {
    passages: plan.criteria.map(({ subject, sourceIds }, index) => {
      const sourceQuotes = quotes(sourceIds);

      return {
        id: `J${index + 1}`,
        text: sourceQuotes[0] ?? "",
        criterion: subject,
        sourceQuotes,
      };
    }),
    warnings: plan.warnings.map(({ explanation, sourceIds }) => ({
      explanation,
      quotes: quotes(sourceIds),
    })),
    metadata: [response.metadata],
  };
}
