import { z } from "zod";

const Config = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4.1-mini"),
  OPENAI_API_KEY: z.string().trim().optional(),
});

export function loadConfig() {
  return Config.parse(process.env);
}
