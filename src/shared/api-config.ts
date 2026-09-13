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

export const ANALYSIS_BODY_LIMIT = "160kb";

export const CASE_FILE_BODY_LIMIT = "2mb";

export const BACKUP_BODY_LIMIT = "8mb";
