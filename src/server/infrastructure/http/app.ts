import type { Express } from "express";
import { registerWorkflowRoutes } from "../../adapters/http/workflow-routes.ts";
import type { WorkflowServices } from "../../adapters/http/workflow-routes.ts";
import type { SavedExecution } from "../../adapters/http/analysis-controller.ts";
import { registerOfferRoutes } from "../offers/routes.ts";
import type { createJobExtractor } from "../../adapters/models/job-extraction.ts";
import type { ProviderRegistry } from "../../application/provider-registry.ts";
import type { DossierRepository } from "../../application/dossiers.ts";
import { registerDossierRoutes } from "../../adapters/http/dossier-routes.ts";
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
import { AnalysisInput } from "../../../shared/analysis.ts";
import type { DocumentsInput } from "../../../shared/analysis.ts";
import type { AnalysisService } from "../../application/analyze.ts";
import { AppError } from "../../application/errors.ts";

type Dependencies = {
  workflows?: WorkflowServices;
  service: AnalysisService;
  readDocuments: () => Promise<DocumentsInput>;
  model: string;
  configured: boolean;
  extractOffer?: ReturnType<typeof createJobExtractor>;
  providers?: ProviderRegistry;
  dossiers?: DossierRepository;
  observe?: (event: RequestEvent) => void;
};

export function createApp({
  service,
  workflows,
  readDocuments,
  model,
  configured,
  observe = () => {},
  providers,
  dossiers,
  extractOffer,
}: Dependencies) {
  const app = express();

  app.disable("x-powered-by");
  app.use(API_ROOT, requestMetadata(observe), localRequestGuard);
  app.use("/api/v1/campaigns", express.json({ limit: "2mb" }));
  app.use("/api/v1/dossiers/restore", express.json({ limit: "8mb" }));
  app.use("/api/v1/dossiers", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "160kb" }));
  app.get(API_PATHS.bootstrap, async (_req, res) => {
    res.json({
      documents: await readDocuments(),
      model,
      configured,
      providers: providers?.options,
      dossiersEnabled: Boolean(dossiers),
      workflowsEnabled: Boolean(workflows),
    });
  });
  if (providers && extractOffer) {
    registerOfferRoutes(app, providers, extractOffer);
  }

  registerWorkspace(app, dossiers, workflows);

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
    createAnalysisController(
      service,
      createMemoryAnalysisStore<SavedExecution>(),
      providers,
      dossiers,
    ),
  );
  app.post(API_PATHS.context, (req, res) => {
    const parsed = AnalysisInput.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        "INVALID_INPUT",
        "Documents ou préférences invalides. Vérifie les champs saisis.",
      );
    }

    res.json(
      (providers
        ? providers.resolve(parsed.data.selection, false)
        : service
      ).preview(parsed.data),
    );
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

function registerWorkspace(
  app: Express,
  dossiers: DossierRepository | undefined,
  workflows: WorkflowServices | undefined,
) {
  if (dossiers) {
    registerDossierRoutes(app, dossiers, (id) => {
      const job = workflows?.jobs.latest(id);

      if (job?.status === "running") {
        workflows?.jobs.cancel(job.id, job.attempt);
      }
    });
  }

  if (workflows) {
    registerWorkflowRoutes(app, workflows);
  }
}
