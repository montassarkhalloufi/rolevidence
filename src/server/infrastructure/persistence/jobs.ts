import { runtimeMessages } from "../../application/locales/runtime-fr.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import { MAX_COMPARISON_BATCHES } from "../../adapters/models/complete-comparison.ts";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { JobRepository, JobRecord } from "../../application/jobs.ts";
import { AnalysisJob } from "../../../shared/workflows.ts";
import { CaseFile } from "../../../shared/case-files.ts";
import { AppError } from "../../application/errors.ts";

const StoredJob = AnalysisJob.extend({
  snapshot: CaseFile,
  checkpoint: z
    .object({
      version: z.string(),
      responses: z
        .array(
          z.object({
            name: z.string(),
            promptVersion: z.string(),
            value: z.unknown(),
            metadata: z
              .object({
                responseId: z.string(),
                model: z.string(),
                durationMs: z.number(),
                inputTokens: z.number().nullable(),
                outputTokens: z.number().nullable(),
                provider: z.enum(["openai", "anthropic"]).optional(),
              })
              .passthrough(),
          }),
        )
        .max(MAX_COMPARISON_BATCHES + 2),
    })
    .nullable(),
});

function read(row: unknown): JobRecord {
  const { payload } = z.object({ payload: z.string() }).parse(row);

  return StoredJob.parse(JSON.parse(payload) as unknown);
}

export function createJobRepository(db: DatabaseSync): JobRepository {
  return {
    get(id) {
      const row = db
        .prepare("SELECT payload FROM analysis_jobs WHERE id=?")
        .get(id);

      if (!row) {
        throw new AppError("NOT_FOUND", errorMessages.jobMissing);
      }

      return read(row);
    },
    latest(caseFileId) {
      const row = db
        .prepare(
          "SELECT payload FROM analysis_jobs WHERE dossier_id=? ORDER BY json_extract(payload,'$.updatedAt') DESC,created_at DESC,id DESC LIMIT 1",
        )
        .get(caseFileId);

      return row ? read(row) : null;
    },
    put(job) {
      try {
        const value = StoredJob.parse(
          job.status === "completed" ? { ...job, checkpoint: null } : job,
        );

        db.prepare(
          "INSERT INTO analysis_jobs VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload",
        ).run(
          value.id,
          value.dossierId,
          value.createdAt,
          value.status,
          JSON.stringify(value),
        );
      } catch {
        throw new AppError(
          "STORAGE_ERROR",
          errorMessages.progressStorageFailed,
        );
      }
    },
    recover() {
      const rows = db
        .prepare("SELECT payload FROM analysis_jobs WHERE status='running'")
        .all();

      for (const row of rows) {
        const job = read(row);

        job.status = "interrupted";
        job.error = runtimeMessages.jobInterrupted;
        db.prepare(
          "UPDATE analysis_jobs SET status=?,payload=? WHERE id=?",
        ).run(job.status, JSON.stringify(job), job.id);
      }
    },
  };
}
