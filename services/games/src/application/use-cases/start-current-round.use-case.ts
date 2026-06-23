import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { type RoundOutput, toRoundOutput } from "./create-round.use-case";

@Injectable()
export class StartCurrentRoundUseCase {
  constructor(private readonly roundsRepository: RoundsRepository) {}

  async execute(now = new Date()): Promise<RoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.startRunning(now);
    const savedRound = await this.roundsRepository.save(currentRound);

    return toRoundOutput(savedRound);
  }
}
