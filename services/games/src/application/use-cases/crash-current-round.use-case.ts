import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { type RoundOutput, toRoundOutput } from "./create-round.use-case";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

@Injectable()
export class CrashCurrentRoundUseCase {
  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

  async execute(now = new Date()): Promise<RoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.crash(now);
    const savedRound = await this.roundsRepository.save(currentRound);
    const output = toRoundOutput(savedRound);

    this.gameEventsPublisher.publish({
      name: "round.crashed",
      payload: {
        roundId: output.roundId,
        status: output.status,
        crashMultiplierBps: output.crashMultiplierBps ?? savedRound.crashMultiplierBps,
        crashedAt: output.crashedAt ?? now.toISOString(),
      },
    });

    return output;
  }
}
