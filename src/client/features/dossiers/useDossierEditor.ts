import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { dossierApi } from "./api.ts";
import type {
  DossierData,
  DossierDraftData,
} from "../../../shared/dossiers.ts";

export function useDossierEditor(initial: DossierData) {
  const [saved, setSaved] = useState(initial);

  const [draft, setDraft] = useState<DossierDraftData>({
    title: initial.title,
    purpose: initial.purpose,
    documents: initial.documents,
    selection: initial.selection,
    offerSource: initial.offerSource,
  });

  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({
      title: saved.title,
      purpose: saved.purpose,
      documents: saved.documents,
      selection: saved.selection,
      offerSource: saved.offerSource,
    });

  const save = useMutation({
    mutationFn: () => dossierApi.save(saved.id, draft, saved.revision),
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
