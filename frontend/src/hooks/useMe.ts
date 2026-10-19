import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

export const meKey = ["me"];

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: () => apiGet<PublicUser>("/auth/me"), retry: false, staleTime: 30_000 });
}
