import { useMutation } from "@tanstack/react-query";
import { api } from "../../../shared/api/client.ts";

export function useContextPreview() {
  return useMutation({ mutationFn: api.context });
}
