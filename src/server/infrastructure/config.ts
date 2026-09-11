import { z } from "zod";

const Config = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4.1-mini"),
  DATABASE_PATH: z.string().min(1).default("storage/rolevidence.sqlite"),
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-sonnet-4-6"),
  ANTHROPIC_API_KEY: z.string().trim().optional(),
  ROLEVIDENCE_TELEMETRY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  LANGSMITH_API_KEY: z.string().trim().optional(),
  LANGSMITH_PROJECT: z.string().default("rolevidence-local"),
  OPENAI_API_KEY: z.string().trim().optional(),
});

export function loadConfig() {
  return Config.parse(process.env);
}
