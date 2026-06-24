"use client";

import { useQuery } from "@tanstack/react-query";
import { crashApi } from "@/lib/api";

export function useMyBets(token?: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ["my-bets", token, page, limit],
    queryFn: () => crashApi.getMyBets(token!, page, limit),
    enabled: Boolean(token),
  });
}
