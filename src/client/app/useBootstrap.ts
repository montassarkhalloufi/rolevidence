import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client.ts";

export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: ({ signal }) => api.bootstrap(signal),
    staleTime: Infinity,
  });
}
