"use client";

import { useSession } from "next-auth/react";

export function useCurrentPlayer() {
  const { data: session, status } = useSession();

  return {
    status,
    playerId: session?.user.id,
    username: session?.user.username ?? session?.user.name ?? session?.user.email,
    accessToken: session?.accessToken,
    isAuthenticated: status === "authenticated",
  };
}
