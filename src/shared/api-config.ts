export const API_ROOT = "/api";

export const API_PATHS = {
  bootstrap: "/api/v1/bootstrap",
  analyses: "/api/v1/analyses",
  context: "/api/v1/analysis-context",
  resumeExtraction: "/api/v1/resume-extractions",
} as const;

export const LOCAL_CLIENT_HEADER = "X-Rolevidence";

export const LOCAL_CLIENT_VALUE = "1";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
