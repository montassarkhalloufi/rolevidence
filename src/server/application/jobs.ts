import { executeJob } from "./execute-job.ts";
import type { AnalysisCheckpoint, AnalysisProgress } from "./execution.ts";
import type {
  Dossier,
  DossierRepository,
  SavedAnalysis,
  Selection,
} from "./dossiers.ts";
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
  snapshot: Dossier;
  checkpoint: AnalysisCheckpoint | null;
};

export interface JobRepository {
  get(id: string): JobRecord;
  latest(dossierId: string): JobRecord | null;
  put(job: JobRecord): void;
  recover(): void;
}

export function createJobRunner(
  repository: JobRepository,
  dossiers: DossierRepository,
  resolve: (selection: Selection) => AnalysisService,
  now: () => string,
) {
  let active: { id: string; controller: AbortController } | null = null;

  let finishing = Promise.resolve();

  repository.recover();

  function launch(job: JobRecord) {
    if (active) {
      throw new AppError(
        "BUSY",
        "Une analyse est déjà en cours. Attendez ou annulez-la.",
      );
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
      dossiers,
      now,
    ).finally(() => {
      active = null;
    });

    return job;
  }

  return {
    get: repository.get,
    latest: repository.latest,
    start(id: string, dossierId: string, revision: number) {
      const previous = findExisting(repository, id);

      if (previous) {
        if (
          previous.dossierId !== dossierId ||
          previous.revision !== revision
        ) {
          throw new AppError(
            "IDEMPOTENCY_CONFLICT",
            "Cette demande correspond à un autre dossier ou une autre version.",
          );
        }

        return previous;
      }

      const snapshot = dossiers.get(dossierId);

      if (
        snapshot.revision !== revision ||
        !snapshot.documents.job.trim() ||
        !snapshot.documents.profile.trim()
      ) {
        throw new AppError(
          "INVALID_INPUT",
          "Enregistrez un profil et une offre complets avant l’analyse.",
        );
      }

      return launch(newJob(id, snapshot, now()));
    },
    resume(id: string, attempt: number) {
      const job = repository.get(id);

      assertResumable(job, attempt);

      dossiers.get(job.dossierId);

      return launch({
        ...job,
        status: "running",
        attempt: job.attempt + 1,
        error: null,
        updatedAt: now(),
      });
    },
    cancel(id: string, attempt: number) {
      const job = repository.get(id);

      if (job.attempt !== attempt) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "Cette annulation concerne une tentative précédente.",
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

function findExisting(repository: JobRepository, id: string) {
  try {
    return repository.get(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

function newJob(id: string, snapshot: Dossier, timestamp: string): JobRecord {
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
    throw new AppError(
      "IDEMPOTENCY_CONFLICT",
      "L’état de cette analyse a changé. Actualisez avant de reprendre.",
    );
  }
}
