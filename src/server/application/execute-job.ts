import type { JobRecord, JobRepository } from "./jobs.ts";
import type { AnalysisService } from "./analyze.ts";
import type { DossierRepository } from "./dossiers.ts";
import { AppError } from "./errors.ts";

export async function executeJob(
  job: JobRecord,
  service: AnalysisService,
  controller: AbortController,
  repository: JobRepository,
  dossiers: DossierRepository,
  now: () => string,
) {
  function persist() {
    job.updatedAt = now();
    repository.put(job);
  }

  try {
    const output = await service.analyze(
      job.snapshot.documents,
      controller.signal,
      {
        checkpoint: job.checkpoint,
        onCheckpoint: (checkpoint) => {
          job.checkpoint = checkpoint;
          persist();
        },
        onProgress: (progress) => {
          job.progress = progress;
          persist();
        },
      },
    );

    controller.signal.throwIfAborted();
    job.progress = { stage: "saving", completed: 0, total: 1 };
    persist();
    job.result = dossiers.append(job.snapshot, output, `job-${job.id}`);
    job.status = "completed";
    job.progress.completed = 1;
    persist();
  } catch (error) {
    const stopping = controller.signal.reason === "shutdown";

    job.status = failureStatus(controller.signal.aborted, stopping);
    job.error = stopping
      ? "Le serveur a été arrêté. Reprenez explicitement les étapes restantes."
      : cancellationMessage(controller.signal.aborted, error);
    try {
      persist();
    } catch {
      /* Existing running record is recoverable after restart; never retry paid work. */
    }
  }
}

function safeJobError(error: unknown) {
  return error instanceof AppError
    ? error.message
    : "L’analyse a été interrompue. Les étapes enregistrées sont conservées.";
}

function failureStatus(aborted: boolean, stopping: boolean) {
  if (stopping) {
    return "interrupted" as const;
  }

  return aborted ? ("cancelled" as const) : ("failed" as const);
}

function cancellationMessage(aborted: boolean, error: unknown) {
  return aborted ? "Analyse annulée à votre demande." : safeJobError(error);
}
