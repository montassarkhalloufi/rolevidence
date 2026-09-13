import { analysisInstructions } from "./prompts/messages.ts";
import { createSourceCatalog } from "./sources.ts";
import { emptyPreferences } from "../../domain/models.ts";
import type { DocumentsInput } from "../../domain/models.ts";

export function createMessages(
  { profile, job, preferences, clarifications }: DocumentsInput,
  jobPassages?: ReturnType<typeof createSourceCatalog>["job"],
) {
  const catalog = createSourceCatalog({
    profile,
    job,
    preferences,
    clarifications,
  });

  return [
    { role: "system" as const, content: analysisInstructions },
    {
      role: "user" as const,
      content: JSON.stringify({
        task: "Compare this profile with this job.",
        preferences: preferences ?? emptyPreferences,
        preferences_sources: catalog.preferences,
        profile: catalog.profile,
        clarifications: catalog.clarifications,
        job: jobPassages ?? catalog.job,
      }),
    },
  ];
}
