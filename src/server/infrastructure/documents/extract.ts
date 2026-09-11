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
    throw new AppError(
      "UNSUPPORTED_FILE",
      "Formats acceptés : PDF, DOCX et TXT.",
    );
  }

  if (buffer.length > RESUME_MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Le fichier dépasse 5 Mo.");
  }

  return new Promise((resolve, reject) => {
    // Extraction isolée, bornée en temps ; le document n'est jamais écrit sur disque.
    const worker = new Worker(new URL("./extract.worker.ts", import.meta.url), {
      workerData: { bytes: buffer, extension },
      execArgv: [], // Ne pas hériter du mode --watch du serveur.
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });

    const timer = setTimeout(() => {
      void worker.terminate();
      reject(
        new AppError(
          "IMPORT_TIMEOUT",
          "L’extraction a dépassé 15 secondes. Essaie un document plus simple.",
        ),
      );
    }, 15000);

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
      reject(new AppError("IMPORT_FAILED", "Impossible de lire ce document."));
    });
    worker.once("exit", () => {
      clearTimeout(timer);
      reject(new AppError("IMPORT_FAILED", "Extraction interrompue."));
    });
  });
}
