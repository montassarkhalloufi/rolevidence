import { RESUME_MAX_BYTES } from "../../../shared/limits.ts";
import { API_ROOT, API_PATHS } from "../../../shared/api-config.ts";
import { requestMetadata, localRequestGuard } from "./middleware.ts";
import type { RequestEvent } from "./middleware.ts";
import { createAnalysisController } from "../../adapters/http/analysis-controller.ts";
import { createMemoryAnalysisStore } from "../analysis-store.ts";
import { errorHandler } from "./errors.ts";
import express from "express";
import multer from "multer";
import { extractCv } from "../documents/extract.ts";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Documents } from "../../../shared/analysis.ts";
import type { DocumentsInput } from "../../../shared/analysis.ts";
import type { AnalysisService } from "../../application/analyze.ts";
import { AppError } from "../../application/errors.ts";

type Dependencies = {
  service: AnalysisService;
  readDocuments: () => Promise<DocumentsInput>;
  model: string;
  configured: boolean;
  observe?: (event: RequestEvent) => void;
};

export function createApp({
  service,
  readDocuments,
  model,
  configured,
  observe = () => {},
}: Dependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(API_ROOT, requestMetadata(observe), localRequestGuard);
  app.use(express.json({ limit: "160kb" }));
  app.get(API_PATHS.bootstrap, async (_req, res) => {
    res.json({ documents: await readDocuments(), model, configured });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: RESUME_MAX_BYTES, files: 1, fields: 0, parts: 2 },
  });

  let importing = false;

  app.post(
    API_PATHS.resumeExtraction,
    upload.single("cv"),
    async (req, res) => {
      if (!req.file) {
        throw new AppError("MISSING_FILE", "Sélectionne un CV.");
      }

      if (importing) {
        throw new AppError("BUSY", "Un import est déjà en cours.");
      }

      importing = true;
      try {
        res.json({
          text: await extractCv(req.file.buffer, req.file.originalname),
        });
      } finally {
        importing = false;
      }
    },
  );
  app.post(
    API_PATHS.analyses,
    createAnalysisController(service, createMemoryAnalysisStore()),
  );
  app.post(API_PATHS.context, (req, res) => {
    const parsed = Documents.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        "INVALID_INPUT",
        "Documents ou préférences invalides. Vérifie les champs saisis.",
      );
    }

    res.json(service.preview(parsed.data));
  });
  app.use(API_ROOT, (_req, _res) => {
    throw new AppError("NOT_FOUND", "Route API introuvable.");
  });
  const clientDist = fileURLToPath(
    new URL("../../../../dist/client", import.meta.url),
  );

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }

  app.use(errorHandler);

  return app;
}
