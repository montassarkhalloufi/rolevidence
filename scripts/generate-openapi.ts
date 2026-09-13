import {
  PAGE_MAX_OFFSET,
  PAGE_MAX_SIZE,
  CASE_FILE_PAGE_SIZE,
} from "../src/shared/limits.ts";
import {
  Campaign,
  CampaignInput,
  CampaignPage,
  AnalysisJob,
  JobStart,
  JobResume,
} from "../src/shared/workflows.ts";
import {
  Backup,
  CaseFile,
  CaseFileDraft,
  CaseFileSave,
  CaseFilePage,
  AnalysisPage,
} from "../src/shared/case-files.ts";
import {
  OfferImportInput,
  OfferImportResponse,
} from "../src/shared/offer-imports.ts";
import { AnalysisInput } from "../src/shared/analysis.ts";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  Documents,
  AnalysisResponse,
  Bootstrap,
} from "../src/shared/analysis.ts";

const schema = (value: z.ZodType) => {
  const { $schema: _schema, ...result } = z.toJSONSchema(value, {
    target: "draft-2020-12",
  });

  return result;
};

const json = (ref: string) => ({
  "application/json": { schema: { $ref: `#/components/schemas/${ref}` } },
});

const response = (ref: string) => ({
  description: "Completed synchronous operation",
  content: json(ref),
});

const problem = {
  description: "Safe problem response",
  content: {
    "application/problem+json": {
      schema: { $ref: "#/components/schemas/Problem" },
    },
  },
};

const headers = [
  {
    name: "X-Rolevidence",
    in: "header",
    required: true,
    schema: { type: "string", const: "1" },
    description: "Local cross-origin request guard; not authentication.",
  },
];

const body = { required: true, content: json("AnalysisInput") };

const contract = {
  openapi: "3.1.0",
  info: {
    title: "Rolevidence local API",
    version: "1.3.0",
    description:
      "Single-user localhost API. Host must be localhost, 127.0.0.1 or [::1], with an optional port. Foreign hosts return 403 before any route. Not authenticated or suitable for public exposure.",
  },
  servers: [{ url: "http://127.0.0.1:3001" }],
  paths: {
    "/api/v1/campaigns": {
      get: {
        parameters: [
          {
            in: "query",
            name: "offset",
            schema: {
              type: "integer",
              minimum: 0,
              maximum: PAGE_MAX_OFFSET,
              default: 0,
            },
          },
        ],
        responses: { 200: response("CampaignPage"), default: problem },
      },
    },
    "/api/v1/campaigns/{id}": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: { responses: { 200: response("Campaign"), default: problem } },
      put: {
        parameters: headers,
        requestBody: { required: true, content: json("CampaignInput") },
        responses: { 201: response("Campaign"), default: problem },
      },
      delete: {
        parameters: headers,
        responses: { 200: response("Deleted"), default: problem },
      },
    },
    "/api/v1/analysis-jobs/{id}": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: { responses: { 200: response("AnalysisJob"), default: problem } },
      put: {
        parameters: headers,
        requestBody: { required: true, content: json("JobStart") },
        responses: {
          200: response("AnalysisJob"),
          202: {
            ...response("AnalysisJob"),
            description:
              "Accepted; poll the job resource. Never automatically resumed.",
          },
          default: problem,
        },
      },
    },
    "/api/v1/analysis-jobs/{id}/cancel": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      post: {
        parameters: headers,
        requestBody: { required: true, content: json("JobResume") },
        responses: { 200: response("AnalysisJob"), default: problem },
      },
    },
    "/api/v1/analysis-jobs/{id}/resume": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      post: {
        parameters: headers,
        requestBody: { required: true, content: json("JobResume") },
        responses: { 202: response("AnalysisJob"), default: problem },
      },
    },
    "/api/v1/dossiers/{id}/latest-job": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        responses: { 200: response("NullableAnalysisJob"), default: problem },
      },
    },
    "/api/v1/dossiers/{id}/backup": {
      get: {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { 200: response("Backup"), default: problem },
      },
    },
    "/api/v1/dossiers/restore": {
      post: {
        parameters: headers,
        requestBody: { required: true, content: json("Backup") },
        responses: { 201: response("Dossier"), default: problem },
      },
    },
    "/api/v1/dossiers": {
      get: {
        operationId: "listDossiers",
        parameters: [
          {
            in: "query",
            name: "q",
            schema: { type: "string", maxLength: 120 },
          },
          {
            in: "query",
            name: "offset",
            schema: {
              type: "integer",
              minimum: 0,
              maximum: PAGE_MAX_OFFSET,
              default: 0,
            },
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: PAGE_MAX_SIZE,
              default: CASE_FILE_PAGE_SIZE,
            },
          },
        ],
        responses: { 200: response("DossierPage"), default: problem },
      },
    },
    "/api/v1/dossiers/{id}": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        operationId: "getDossier",
        responses: { 200: response("Dossier"), default: problem },
      },
      put: {
        operationId: "saveDossier",
        parameters: headers,
        requestBody: { required: true, content: json("DossierSave") },
        responses: {
          201: response("Dossier"),
          200: response("Dossier"),
          409: problem,
          507: problem,
          default: problem,
        },
      },
      delete: {
        operationId: "deleteDossier",
        parameters: headers,
        requestBody: { required: true, content: json("DeleteDossier") },
        responses: { 200: response("Deleted"), 409: problem, default: problem },
      },
    },
    "/api/v1/dossiers/{id}/analyses": {
      get: {
        operationId: "listDossierAnalyses",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            in: "query",
            name: "offset",
            schema: {
              type: "integer",
              minimum: 0,
              maximum: PAGE_MAX_OFFSET,
              default: 0,
            },
          },
          {
            in: "query",
            name: "limit",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: PAGE_MAX_SIZE,
              default: CASE_FILE_PAGE_SIZE,
            },
          },
        ],
        responses: { 200: response("AnalysisPage"), default: problem },
      },
    },
    "/api/v1/offer-imports": {
      post: {
        operationId: "importPublicOffer",
        parameters: [
          ...headers,
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string", pattern: "^[A-Za-z0-9_-]{16,128}$" },
          },
        ],
        requestBody: { required: true, content: json("OfferImportInput") },
        responses: { 200: response("OfferImportResponse"), default: problem },
      },
    },
    "/api/v1/bootstrap": {
      get: {
        operationId: "getBootstrap",
        responses: { 200: response("Bootstrap"), default: problem },
      },
    },
    "/api/v1/analysis-context": {
      post: {
        operationId: "previewAnalysis",
        parameters: headers,
        requestBody: body,
        responses: {
          200: {
            description: "Provider request preview; no LLM call",
            content: { "application/json": { schema: { type: "object" } } },
          },
          400: problem,
          403: problem,
          413: problem,
          default: problem,
        },
      },
    },
    "/api/v1/analyses": {
      post: {
        operationId: "analyzeDocuments",
        parameters: [
          ...headers,
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string", pattern: "^[A-Za-z0-9_-]{16,128}$" },
            description:
              "Same validated input replays the outcome for five minutes after settlement, in this process only. Conflict returns 409. Failed outcomes also replay.",
          },
        ],
        requestBody: body,
        responses: {
          200: {
            ...response("AnalysisResponse"),
            headers: {
              "Idempotency-Replayed": {
                schema: { type: "string", enum: ["true", "false"] },
              },
              "X-Request-Id": { schema: { type: "string", format: "uuid" } },
            },
          },
          400: problem,
          403: problem,
          409: problem,
          413: problem,
          422: problem,
          429: problem,
          502: problem,
          503: problem,
          504: problem,
          default: problem,
        },
      },
    },
    "/api/v1/resume-extractions": {
      post: {
        operationId: "extractResume",
        parameters: headers,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["cv"],
                properties: {
                  cv: {
                    type: "string",
                    format: "binary",
                    description:
                      "One PDF, DOCX or UTF-8 TXT; maximum 5 MiB. PDF up to 20 pages. Extracted text up to 16000 characters.",
                  },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          200: response("ResumeText"),
          400: problem,
          403: problem,
          413: problem,
          415: problem,
          422: problem,
          429: problem,
          default: problem,
        },
      },
    },
  },
  components: {
    schemas: {
      Campaign: schema(Campaign),
      CampaignInput: schema(CampaignInput),
      CampaignPage: schema(CampaignPage),
      AnalysisJob: schema(AnalysisJob),
      NullableAnalysisJob: schema(AnalysisJob.nullable()),
      JobStart: schema(JobStart),
      JobResume: schema(JobResume),
      Backup: schema(Backup),
      AnalysisInput: schema(AnalysisInput),
      Dossier: schema(CaseFile),
      DossierDraft: schema(CaseFileDraft),
      DossierSave: schema(CaseFileSave),
      DossierPage: schema(CaseFilePage),
      AnalysisPage: schema(AnalysisPage),
      OfferImportInput: schema(OfferImportInput),
      OfferImportResponse: schema(OfferImportResponse),
      DeleteDossier: schema(
        z.object({ revision: z.number().int().positive() }).strict(),
      ),
      Deleted: schema(z.object({ deleted: z.literal(true) })),
      Documents: {
        ...schema(Documents),
        description:
          "Remote days are only accepted with hybrid work mode. Salary is fixed gross annual EUR excluding bonuses. Omitted preferences are treated as empty.",
      },
      AnalysisResponse: schema(AnalysisResponse),
      Bootstrap: schema(Bootstrap),
      ResumeText: {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string" } },
      },
      Problem: {
        type: "object",
        required: ["type", "title", "status", "detail", "code", "requestId"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          code: { type: "string" },
          requestId: { type: "string", format: "uuid" },
        },
      },
    },
  },
};

const output = JSON.stringify(contract, null, 2) + "\n";

const path = new URL("../docs/openapi.json", import.meta.url);

if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== output) {
    throw new Error("OpenAPI drift: run npm run api:generate");
  }

  console.log("OpenAPI matches runtime schemas.");
} else {
  await writeFile(path, output);
}
