import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { ModelSelectionData } from "../../../shared/providers.ts";
import type { OfferSourceData } from "../../../shared/dossiers.ts";
import { dossierApi } from "./api.ts";

export function useOfferImport(
  selection: ModelSelectionData,
  onBusy: (value: boolean) => void,
) {
  const [url, setUrl] = useState("");

  const [preview, setPreview] = useState<OfferSourceData | null>(null);

  const [text, setText] = useState("");

  const key = useRef({ payload: "", key: crypto.randomUUID() });

  const mutation = useMutation({
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
    mutationFn: () => {
      const payload = JSON.stringify({ url, selection });

      if (key.current.payload !== payload) {
        key.current = { payload, key: crypto.randomUUID() };
      }

      return dossierApi.importOffer(url, selection, key.current.key);
    },
    onSuccess: (value) => {
      setPreview(value.source);
      setText(value.source.text);
    },
  });

  return {
    url,
    setUrl,
    preview,
    setPreview,
    text,
    setText,
    reset: () => {
      key.current = { payload: "", key: crypto.randomUUID() };
      mutation.reset();
    },
    mutation,
  };
}
