import { z } from "zod";
import {
  IDEMPOTENCY_KEY_MIN_CHARACTERS,
  IDEMPOTENCY_KEY_MAX_CHARACTERS,
} from "./limits.ts";

export const RequestKey = z
  .string()
  .min(IDEMPOTENCY_KEY_MIN_CHARACTERS)
  .max(IDEMPOTENCY_KEY_MAX_CHARACTERS)
  .regex(/^[A-Za-z0-9_-]+$/);
