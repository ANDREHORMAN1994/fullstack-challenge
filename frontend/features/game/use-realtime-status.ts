"use client";

import { useEffect, useState } from "react";
import { createGameSocket } from "@/lib/realtime";

export function useRealtimeStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createGameSocket();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected };
}
