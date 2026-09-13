import { runtimeMessages } from "./locales/runtime-fr.ts";
import { errorMessages } from "./locales/errors-fr.ts";
import { executeJob } from "./execute-job.ts";
import type { AnalysisCheckpoint, AnalysisProgress } from "./execution.ts";
import type {
  CaseFile,
  CaseFileRepository,
  SavedAnalysis,
  Selection,
} from "./case-files.ts";
import type { AnalysisService } from "./analyze.ts";
import { AppError } from "./errors.ts";

export type AnalysisJob = {
  id: string;
  dossierId: string;
  revision: number;
  status: "running" | "cancelled" | "interrupted" | "failed" | "completed";
  progress: AnalysisProgress;
  createdAt: string;
  updatedAt: string;
  attempt: number;
  error: string | null;
  result: SavedAnalysis | null;
};

export type JobRecord = AnalysisJob & {
  snapshot: CaseFile;
  checkpoint: AnalysisCheckpoint | null;
};

export interface JobRepository {
  get(id: string): JobRecord;
  latest(caseFileId: string): JobRecord | null;
  put(job: JobRecord): void;
  recover(): void;
}

export function createJobRunner(
  repository: JobRepository,
  caseFiles: CaseFileRepository,
  resolve: (selection: Selection) => AnalysisService,
  now: () => string,
) {
  let active: { id: string; controller: AbortController } | null = null;

  let finishing = Promise.resolve();

  repository.recover();

  const get = (id: string) => current(repository.get(id), active?.id);

  function latest(id: string) {
    const running = active ? findExisting(repository, active.id) : null;

    if (running?.dossierId === id) {
      return running;
    }

    const job = repository.latest(id);

    return job ? current(job, active?.id) : null;
  }

  function launch(job: JobRecord) {
    if (active) {
      throw new AppError("BUSY", errorMessages.jobBusy);
    }

    const service = resolve(job.snapshot.selection);

    const controller = new AbortController();

    repository.put(job);
    active = { id: job.id, controller };
    finishing = executeJob(
      job,
      service,
      controller,
      repository,
      caseFiles,
      now,
    ).finally(() => {
      active = null;
    });

    return job;
  }

  return {
    get,
    latest,
    start(id: string, caseFileId: string, revision: number) {
      const previous = findExisting({ get }, id);

      if (previous) {
        if (
          previous.dossierId !== caseFileId ||
          previous.revision !== revision
        ) {
          throw new AppError(
            "IDEMPOTENCY_CONFLICT",
            errorMessages.jobIdentityConflict,
          );
        }

        return previous;
      }

      const snapshot = caseFiles.get(caseFileId);

      assertCompleteRevision(snapshot, revision);

      return launch(newJob(id, snapshot, now()));
    },
    resume(id: string, attempt: number) {
      const job = get(id);

      assertResumable(job, attempt);

      caseFiles.get(job.dossierId);

      return launch({
        ...job,
        status: "running",
        attempt: job.attempt + 1,
        error: null,
        updatedAt: now(),
      });
    },
    cancel(id: string, attempt: number) {
      const job = get(id);

      if (job.attempt !== attempt) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          errorMessages.staleCancellation,
        );
      }

      if (active?.id === id) {
        active.controller.abort();
      }

      return job;
    },
    shutdown: () => {
      active?.controller.abort("shutdown");

      return finishing;
    },
    isBusy: () => active !== null,
  };
}

function findExisting(repository: Pick<JobRepository, "get">, id: string) {
  try {
    return repository.get(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

function newJob(id: string, snapshot: CaseFile, timestamp: string): JobRecord {
  return {
    id,
    dossierId: snapshot.id,
    revision: snapshot.revision,
    snapshot,
    checkpoint: null,
    status: "running",
    progress: { stage: "preparation", completed: 0, total: 1 },
    createdAt: timestamp,
    updatedAt: timestamp,
    attempt: 1,
    error: null,
    result: null,
  };
}

function assertResumable(job: JobRecord, attempt: number) {
  if (
    job.attempt !== attempt ||
    job.status === "running" ||
    job.status === "completed"
  ) {
    throw new AppError("IDEMPOTENCY_CONFLICT", errorMessages.unsupportedResume);
  }
}

function current(job: JobRecord, activeId: string | undefined): JobRecord {
  if (job.status !== "running" || activeId === job.id) {
    return job;
  }

  return {
    ...job,
    status: "interrupted",
    error: runtimeMessages.jobStorageInterrupted,
  };
}

function assertCompleteRevision(snapshot: CaseFile, revision: number) {
  if (
    snapshot.revision !== revision ||
    !snapshot.documents.job.trim() ||
    !snapshot.documents.profile.trim()
  ) {
    throw new AppError("INVALID_INPUT", errorMessages.incompleteSavedInputs);
  }
}
