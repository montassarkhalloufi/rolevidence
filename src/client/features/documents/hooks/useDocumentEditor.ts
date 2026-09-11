import { RESUME_MAX_BYTES } from "../../../../shared/limits.ts";
import { fr } from "../../../shared/i18n/fr.ts";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../shared/api/client.ts";
import type { DocumentsInput } from "../../../../shared/analysis.ts";

export function useDocumentEditor(
  documents: DocumentsInput,
  onChange: (value: DocumentsInput) => void,
  onImporting: (value: boolean) => void,
) {
  const mutation = useMutation({ mutationFn: api.importCv });

  const [active, setActive] = useState<"profile" | "job">("profile");

  const [notice, setNotice] = useState<string>(fr.exampleLoaded);

  const [error, setError] = useState("");

  async function importFile(file: File) {
    if (file.size > RESUME_MAX_BYTES) {
      setError(fr.fileTooLarge);

      return;
    }

    setError("");
    setNotice(fr.extracting);
    onImporting(true);
    try {
      const { text } = await mutation.mutateAsync(file);

      onChange({ ...documents, profile: text });
      setActive("profile");
      setNotice(`${file.name} importé. Relisez le texte avant l’analyse.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : fr.importError);
      setNotice(fr.previousContent);
    } finally {
      onImporting(false);
    }
  }

  return { active, setActive, notice, setNotice, error, setError, importFile };
}
