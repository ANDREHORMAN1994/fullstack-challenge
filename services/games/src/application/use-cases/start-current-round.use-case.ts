import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { type RoundOutput, toRoundOutput } from "./create-round.use-case";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

@Injectable()
export class StartCurrentRoundUseCase {
  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

  async execute(now = new Date()): Promise<RoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.startRunning(now);
    const savedRound = await this.roundsRepository.save(currentRound);
    const output = toRoundOutput(savedRound);

    this.gameEventsPublisher.publish({
      name: "round.started",
      payload: {
        roundId: output.roundId,
        status: output.status,
        runningStartedAt: output.runningStartedAt ?? now.toISOString(),
      },
    });

    return output;
  }
}
