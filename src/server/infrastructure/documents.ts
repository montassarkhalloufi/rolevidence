import { readFile } from "node:fs/promises";
import { Documents } from "../../shared/analysis.ts";

export async function readExampleDocuments() {
  const [profile, job] = await Promise.all([
    readFile(new URL("../../../data/profile.md", import.meta.url), "utf8"),
    readFile(new URL("../../../data/job.md", import.meta.url), "utf8"),
  ]);

  return Documents.parse({ profile, job });
}
