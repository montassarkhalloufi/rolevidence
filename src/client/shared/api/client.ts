import {
  API_PATHS,
  LOCAL_CLIENT_HEADER,
  LOCAL_CLIENT_VALUE,
  IDEMPOTENCY_HEADER,
} from "../../../shared/api-config.ts";
import { fr } from "../i18n/fr.ts";
import { z } from "zod";
import { AnalysisResponse, Bootstrap } from "../../../shared/analysis.ts";
import type { DocumentsInput } from "../../../shared/analysis.ts";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, init);

  const body: unknown = await response.json();

  if (!response.ok) {
    const parsed = z.object({ detail: z.string() }).safeParse(body);

    throw new Error(parsed.success ? parsed.data.detail : fr.serverError);
  }

  return body;
}

const jsonRequest = (documents: DocumentsInput): RequestInit => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    [LOCAL_CLIENT_HEADER]: LOCAL_CLIENT_VALUE,
  },
  body: JSON.stringify(documents),
});

export const api = {
  bootstrap: async (signal: AbortSignal) =>
    Bootstrap.parse(await request(API_PATHS.bootstrap, { signal })),
  analyze: async (documents: DocumentsInput, key: string) =>
    AnalysisResponse.parse(
      await request(API_PATHS.analyses, {
        ...jsonRequest(documents),
        headers: {
          ...jsonRequest(documents).headers,
          [IDEMPOTENCY_HEADER]: key,
        },
      }),
    ),
  context: (documents: DocumentsInput) =>
    request(API_PATHS.context, jsonRequest(documents)),
  importCv: async (file: File) => {
    const body = new FormData();

    body.append("cv", file);

    return z.object({ text: z.string() }).parse(
      await request(API_PATHS.resumeExtraction, {
        method: "POST",
        headers: { [LOCAL_CLIENT_HEADER]: LOCAL_CLIENT_VALUE },
        body,
      }),
    );
  },
};
