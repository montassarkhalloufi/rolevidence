import { draftKey } from "./draft-key.ts";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { caseFileApi } from "./api.ts";
import type {
  CaseFileData,
  CaseFileDraftData,
} from "../../../shared/case-files.ts";

export function useCaseFileEditor(initial: CaseFileData) {
  const [saved, setSaved] = useState(initial);

  const [draft, setDraft] = useState<CaseFileDraftData>({
    tracking: initial.tracking,
    title: initial.title,
    purpose: initial.purpose,
    documents: initial.documents,
    selection: initial.selection,
    offerSource: initial.offerSource,
  });

  const dirty =
    draftKey(draft) !==
    draftKey({
      tracking: saved.tracking,
      title: saved.title,
      purpose: saved.purpose,
      documents: saved.documents,
      selection: saved.selection,
      offerSource: saved.offerSource,
    });

  const save = useMutation({
    mutationFn: () => caseFileApi.save(saved.id, draft, saved.revision),
    onSuccess: setSaved,
  });

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener("beforeunload", prevent);

    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  return { saved, draft, setDraft, dirty, save };
}
