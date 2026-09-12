import type { StructuredRequest } from "../src/server/adapters/models/structured.ts";

export function identityPlan(request: StructuredRequest) {
  const input = JSON.parse(request.messages[1]?.content ?? "{}") as {
    passages: { id: string; text: string }[];
  };

  return {
    criteria: input.passages.map(({ id, text }) => ({
      subject: text,
      sourceIds: [id],
    })),
    warnings: [],
  };
}
