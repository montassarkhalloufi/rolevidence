import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dossierApi } from "./api.ts";
import { emptyPreferences } from "../../../shared/analysis.ts";
import type { BootstrapData } from "../../../shared/analysis.ts";

export function useDossierHome(
  bootstrap: BootstrapData,
  onOpen: (id: string) => void,
) {
  const [query, setQuery] = useState("");

  const [offset, setOffset] = useState(0);

  const [title, setTitle] = useState("");

  const [removing, setRemoving] = useState<string | null>(null);

  const client = useQueryClient();

  const list = useQuery({
    queryKey: ["dossiers", query, offset],
    queryFn: ({ signal }) => dossierApi.list(query, offset, signal),
  });

  const create = useMutation({
    mutationFn: () => {
      const option =
        bootstrap.providers?.find((value) => value.configured) ??
        bootstrap.providers?.[0];

      return dossierApi.save(
        crypto.randomUUID(),
        {
          title,
          purpose: "job_search",
          documents: { profile: "", job: "", preferences: emptyPreferences },
          selection: {
            provider: option?.provider ?? "openai",
            model: option?.model ?? bootstrap.model,
          },
          offerSource: null,
        },
        0,
      );
    },
    onSuccess: (dossier) => onOpen(dossier.id),
  });

  const remove = useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      dossierApi.delete(id, revision),
    onSuccess: async () => {
      setRemoving(null);
      await client.invalidateQueries({ queryKey: ["dossiers"] });
    },
  });

  return {
    query,
    setQuery,
    offset,
    setOffset,
    title,
    setTitle,
    removing,
    setRemoving,
    list,
    create,
    remove,
  };
}
