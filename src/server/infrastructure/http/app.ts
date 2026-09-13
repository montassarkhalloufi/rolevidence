import {
  ANALYSIS_BODY_LIMIT,
  CASE_FILE_BODY_LIMIT,
  BACKUP_BODY_LIMIT,
} from "../../../shared/api-config.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
import type { Express } from "express";
import { registerWorkflowRoutes } from "../../adapters/http/workflow-routes.ts";
import type { WorkflowServices } from "../../adapters/http/workflow-routes.ts";
import type { SavedExecution } from "../../adapters/http/analysis-controller.ts";
import { registerOfferRoutes } from "../offers/routes.ts";
import type { createJobExtractor } from "../../adapters/models/job-extraction.ts";
import type { ProviderRegistry } from "../../application/provider-registry.ts";
import type { CaseFileRepository } from "../../application/case-files.ts";
import { registerCaseFileRoutes } from "../../adapters/http/case-file-routes.ts";
import { RESUME_MAX_BYTES } from "../../../shared/limits.ts";
import { API_ROOT, API_PATHS } from "../../../shared/api-config.ts";
import {
  requestMetadata,
  localRequestGuard,
  localHostGuard,
} from "./middleware.ts";
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
  caseFiles?: CaseFileRepository;
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
  caseFiles,
  extractOffer,
}: Dependencies) {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestMetadata(observe), localHostGuard);

  app.use(API_ROOT, localRequestGuard);

  app.use("/api/v1/campaigns", express.json({ limit: CASE_FILE_BODY_LIMIT }));

  app.use(
    "/api/v1/dossiers/restore",
    express.json({ limit: BACKUP_BODY_LIMIT }),
  );

  app.use("/api/v1/dossiers", express.json({ limit: CASE_FILE_BODY_LIMIT }));

  app.use(express.json({ limit: ANALYSIS_BODY_LIMIT }));

  app.get(API_PATHS.bootstrap, async (_req, res) => {
    res.json({
      documents: await readDocuments(),
      model,
      configured,
      providers: providers?.options,
      dossiersEnabled: Boolean(caseFiles),
      workflowsEnabled: Boolean(workflows),
    });
  });

  if (providers && extractOffer) {
    registerOfferRoutes(app, providers, extractOffer);
  }

  registerWorkspace(app, caseFiles, workflows);

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
        throw new AppError("MISSING_FILE", errorMessages.missingFile);
      }

      if (importing) {
        throw new AppError("BUSY", errorMessages.importBusy);
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
      caseFiles,
    ),
  );

  app.post(API_PATHS.context, (req, res) => {
    const parsed = AnalysisInput.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", errorMessages.invalidDocuments);
    }

    res.json(
      (providers
        ? providers.resolve(parsed.data.selection, false)
        : service
      ).preview(parsed.data),
    );
  });

  app.use(API_ROOT, (_req, _res) => {
    throw new AppError("NOT_FOUND", errorMessages.unknownRoute);
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
  caseFiles: CaseFileRepository | undefined,
  workflows: WorkflowServices | undefined,
) {
  if (caseFiles) {
    registerCaseFileRoutes(app, caseFiles, (id) => {
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
