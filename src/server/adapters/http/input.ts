import { errorMessages } from "../../application/locales/errors-fr.ts";
import type { z } from "zod";
import { AppError } from "../../application/errors.ts";

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError("INVALID_INPUT", errorMessages.invalidHttpInput);
  }

  return parsed.data;
}
