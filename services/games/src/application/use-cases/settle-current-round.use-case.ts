import { Injectable } from "@nestjs/common";
import { BetsRepository } from "../repositories/bet.repository";
import { RoundsRepository } from "../repositories/rounds.repository";
import { type RoundOutput, toRoundOutput } from "./create-round.use-case";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

export type SettleCurrentRoundOutput = {
  round: RoundOutput;
  lostBetsCount: number;
};

@Injectable()
export class SettleCurrentRoundUseCase {
  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly betsRepository: BetsRepository,
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

  async execute(now = new Date()): Promise<SettleCurrentRoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    const bets = await this.betsRepository.findManyByRoundId(currentRound.id);
    let lostBetsCount = 0;

    for (const bet of bets) {
      if (bet.getStatus() !== "PLACED") {
        continue;
      }

      bet.markAsLost(now);
      await this.betsRepository.create(bet);
      lostBetsCount += 1;
    }

    currentRound.settle(now);
    const savedRound = await this.roundsRepository.save(currentRound);
    const round = toRoundOutput(savedRound);

    this.gameEventsPublisher.publish({
      name: "round.settled",
      payload: {
        roundId: round.roundId,
        status: round.status,
        settledAt: round.settledAt ?? now.toISOString(),
        lostBetsCount,
      },
    });

    return {
      round,
      lostBetsCount,
    };
  }
}
