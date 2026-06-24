"use client";

import { useQuery } from "@tanstack/react-query";
import { crashApi } from "@/lib/api";

export function useRoundHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["round-history", page, limit],
    queryFn: () => crashApi.getRoundHistory(page, limit),
  });
}
