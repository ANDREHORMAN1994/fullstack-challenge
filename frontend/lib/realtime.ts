import { io, type Socket } from "socket.io-client";

export type GameRealtimeEvent =
  | { name: "round.created"; payload: Record<string, unknown> }
  | { name: "round.started"; payload: Record<string, unknown> }
  | { name: "round.multiplier"; payload: Record<string, unknown> }
  | { name: "round.crashed"; payload: Record<string, unknown> }
  | { name: "round.settled"; payload: Record<string, unknown> }
  | { name: "bet.placed"; payload: Record<string, unknown> }
  | { name: "bet.cashed_out"; payload: Record<string, unknown> };

export const realtimeEvents = [
  "round.created",
  "round.started",
  "round.multiplier",
  "round.crashed",
  "round.settled",
  "bet.placed",
  "bet.cashed_out",
] as const;

export function createGameSocket(): Socket {
  const baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "http://localhost:8000";

  return io(`${baseUrl}/games`, {
    transports: ["websocket"],
    autoConnect: false,
  });
}
