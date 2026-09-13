import { MAX_PDF_PAGES } from "../../../shared/limits.ts";
import { runtimeMessages } from "../../application/locales/runtime-fr.ts";
import { parentPort, workerData } from "node:worker_threads";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { DOCUMENT_MAX_CHARACTERS } from "../../../shared/limits.ts";

const PDF_SIGNATURE = "%PDF-";

class InvalidDocument extends Error {}

async function readPdf(buffer: Buffer) {
  if (buffer.subarray(0, PDF_SIGNATURE.length).toString() !== PDF_SIGNATURE) {
    throw new InvalidDocument(runtimeMessages.invalidPdf);
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo();

    if (info.total > MAX_PDF_PAGES) {
      throw new InvalidDocument(runtimeMessages.pdfTooLong);
    }

    const result = await parser.getText();

    return result.pages.map((page) => page.text).join("\n\n");
  } finally {
    await parser.destroy();
  }
}

function readText(buffer: Buffer) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);

  if (text.includes("\0")) {
    throw new InvalidDocument(runtimeMessages.invalidText);
  }

  return text;
}

const readers: Record<string, (buffer: Buffer) => string | Promise<string>> = {
  ".pdf": readPdf,
  ".docx": async (buffer) => (await mammoth.extractRawText({ buffer })).value,
  ".txt": readText,
};

function validateText(text: string) {
  if (!text) {
    throw new InvalidDocument(runtimeMessages.emptyDocument);
  }

  if (text.length > DOCUMENT_MAX_CHARACTERS) {
    throw new InvalidDocument(runtimeMessages.documentTooLong);
  }

  return text;
}

const { bytes, extension } = workerData as {
  bytes: Uint8Array;
  extension: string;
};

try {
  const reader = readers[extension];

  if (!reader) {
    throw new InvalidDocument(runtimeMessages.unsupportedDocument);
  }

  const text = validateText((await reader(Buffer.from(bytes))).trim());

  parentPort?.postMessage({ kind: "cv-extracted", text });
} catch (error) {
  // Parser errors can contain document data; expose only our own safe messages.
  const message =
    error instanceof InvalidDocument
      ? error.message
      : runtimeMessages.unreadableDocument;

  parentPort?.postMessage({ kind: "cv-extracted", error: message });
}
