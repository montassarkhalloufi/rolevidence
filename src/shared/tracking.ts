import { z } from "zod";

export const TRACKING_MAX_CHARACTERS = 8000;

export const Tracking = z
  .object({
    status: z.enum(["preparing", "applied", "interview", "offer", "closed"]),
    notes: z.string().max(TRACKING_MAX_CHARACTERS),
    preparation: z.string().max(TRACKING_MAX_CHARACTERS),
    interview: z.string().max(TRACKING_MAX_CHARACTERS),
  })
  .strict();
