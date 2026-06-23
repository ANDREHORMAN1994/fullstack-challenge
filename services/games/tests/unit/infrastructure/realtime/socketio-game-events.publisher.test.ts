import { describe, expect, it, mock } from "bun:test";
import { SocketioGameEventsPublisher } from "@/infrastructure/realtime/socketio-game-events.publisher";
import type { Server } from "socket.io";

describe("SocketioGameEventsPublisher", () => {
  it("emits game events to all connected websocket clients", () => {
    const publisher = new SocketioGameEventsPublisher();
    const emit = mock(() => undefined);
    publisher.attachServer({ emit } as unknown as Server);

    publisher.publish({
      name: "round.multiplier",
      payload: {
        roundId: "round-1",
        multiplierBps: 125,
      },
    });

    expect(emit).toHaveBeenCalledWith("round.multiplier", {
      roundId: "round-1",
      multiplierBps: 125,
    });
    expect(publisher.getPublishedEvents()).toEqual([
      {
        name: "round.multiplier",
        payload: {
          roundId: "round-1",
          multiplierBps: 125,
        },
      },
    ]);
  });
});
