"use client";

import { useQuery } from "@tanstack/react-query";
import { crashApi } from "@/lib/api";

export function useCurrentRound() {
  return useQuery({
    queryKey: ["current-round"],
    queryFn: crashApi.getCurrentRound,
    retry: false,
  });
}
