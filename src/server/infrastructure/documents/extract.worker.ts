import { parentPort, workerData } from "node:worker_threads";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { DOCUMENT_MAX_CHARACTERS } from "../../../shared/limits.ts";

const MAX_PDF_PAGES = 20;

class InvalidDocument extends Error {}

async function readPdf(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new InvalidDocument("Le fichier ne correspond pas à un PDF valide.");
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo();

    if (info.total > MAX_PDF_PAGES) {
      throw new InvalidDocument("Le CV dépasse la limite de 20 pages.");
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
    throw new InvalidDocument("Le fichier TXT doit contenir du texte UTF-8.");
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
    throw new InvalidDocument(
      "Aucun texte extrait. Pour un PDF scanné, utilise une version texte : l’OCR n’est pas disponible.",
    );
  }

  if (text.length > DOCUMENT_MAX_CHARACTERS) {
    throw new InvalidDocument(
      "Le texte dépasse 16 000 caractères. Importe une version plus courte.",
    );
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
    throw new InvalidDocument("Format de document non pris en charge.");
  }

  const text = validateText((await reader(Buffer.from(bytes))).trim());

  parentPort?.postMessage({ kind: "cv-extracted", text });
} catch (error) {
  // Parser errors can contain document data; expose only our own safe messages.
  const message =
    error instanceof InvalidDocument
      ? error.message
      : "Document illisible ou protégé. Essaie une version PDF texte, DOCX ou TXT valide.";

  parentPort?.postMessage({ kind: "cv-extracted", error: message });
}
