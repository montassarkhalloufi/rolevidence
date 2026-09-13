import { EXTRACTION_TIMEOUT_MS } from "../../../shared/limits.ts";
import { EXTRACTION_HEAP_MEGABYTES } from "../../../shared/limits.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import { RESUME_MAX_BYTES } from "../../../shared/limits.ts";
import { extname } from "node:path";
import { Worker } from "node:worker_threads";
import { AppError } from "../../application/errors.ts";

export async function extractCv(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const extension = extname(filename).toLowerCase();

  if (![".pdf", ".docx", ".txt"].includes(extension)) {
    throw new AppError("UNSUPPORTED_FILE", errorMessages.unsupportedFile);
  }

  if (buffer.length > RESUME_MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", errorMessages.oversizedFile);
  }

  return new Promise((resolve, reject) => {
    // Isolated, time-bounded extraction; documents are never written to disk.
    const worker = new Worker(new URL("./extract.worker.ts", import.meta.url), {
      workerData: { bytes: buffer, extension },
      execArgv: [], // Do not inherit the server watch mode.
      resourceLimits: { maxOldGenerationSizeMb: EXTRACTION_HEAP_MEGABYTES },
    });

    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new AppError("IMPORT_TIMEOUT", errorMessages.extractionTimeout));
    }, EXTRACTION_TIMEOUT_MS);

    worker.on(
      "message",
      (result: { kind?: string; text?: string; error?: string }) => {
        if (result.kind !== "cv-extracted") {
          return;
        } // Ignorer les messages internes de Node en mode watch.

        clearTimeout(timer);
        void worker.terminate();
        if (result.text) {
          resolve(result.text);
        } else {
          reject(
            new AppError(
              "IMPORT_FAILED",
              result.error ?? "Extraction impossible.",
            ),
          );
        }
      },
    );
    worker.once("error", () => {
      clearTimeout(timer);
      reject(new AppError("IMPORT_FAILED", errorMessages.extractionFailed));
    });
    worker.once("exit", () => {
      clearTimeout(timer);
      reject(
        new AppError("IMPORT_FAILED", errorMessages.extractionInterrupted),
      );
    });
  });
}
