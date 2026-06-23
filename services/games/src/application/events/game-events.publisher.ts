export type GameEvent =
  | {
      name: "round.created";
      payload: {
        roundId: string;
        status: string;
        serverSeedHash: string;
        clientSeed: string;
        nonce: number;
        bettingStartedAt: string;
      };
    }
  | {
      name: "round.started";
      payload: {
        roundId: string;
        status: string;
        runningStartedAt: string;
      };
    }
  | {
      name: "round.multiplier";
      payload: {
        roundId: string;
        multiplierBps: number;
      };
    }
  | {
      name: "round.crashed";
      payload: {
        roundId: string;
        status: string;
        crashMultiplierBps: number;
        crashedAt: string;
      };
    }
  | {
      name: "round.settled";
      payload: {
        roundId: string;
        status: string;
        settledAt: string;
        lostBetsCount: number;
      };
    }
  | {
      name: "bet.placed";
      payload: {
        betId: string;
        playerId: string;
        roundId: string;
        amountCents: string;
      };
    }
  | {
      name: "bet.cashed_out";
      payload: {
        betId: string;
        playerId: string;
        roundId: string;
        cashoutMultiplierBps: number;
        payoutCents: string;
      };
    };

export abstract class GameEventsPublisher {
  abstract publish(event: GameEvent): void;
}

export const NOOP_GAME_EVENTS_PUBLISHER: GameEventsPublisher = {
  publish: () => undefined,
};
