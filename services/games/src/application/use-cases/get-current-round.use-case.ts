import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { type RoundOutput, toRoundOutput } from "./create-round.use-case";

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(private readonly roundsRepository: RoundsRepository) {}

  async execute(): Promise<RoundOutput | null> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) return null;

    return toRoundOutput(currentRound);
  }
}
