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

const body = { required: true, content: json("Documents") };

const contract = {
  openapi: "3.1.0",
  info: {
    title: "Rolevidence local API",
    version: "1.1.0",
    description:
      "Single-user localhost API. Not authenticated or suitable for public exposure.",
  },
  servers: [{ url: "http://127.0.0.1:3001" }],
  paths: {
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
