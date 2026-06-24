"use client";

import { useQuery } from "@tanstack/react-query";
import { crashApi } from "@/lib/api";

export function useGameOverview() {
  const currentRoundQuery = useQuery({
    queryKey: ["current-round"],
    queryFn: crashApi.getCurrentRound,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["round-history"],
    queryFn: () => crashApi.getRoundHistory(),
  });

  return {
    currentRound: currentRoundQuery.data,
    currentRoundStatus: currentRoundQuery.status,
    isCurrentRoundLoading: currentRoundQuery.isLoading,
    isCurrentRoundError: currentRoundQuery.isError,
    currentRoundError: currentRoundQuery.error,
    recentRounds: historyQuery.data?.items ?? [],
    historyStatus: historyQuery.status,
    isHistoryLoading: historyQuery.isLoading,
    isHistoryError: historyQuery.isError,
    historyError: historyQuery.error,
  };
}
