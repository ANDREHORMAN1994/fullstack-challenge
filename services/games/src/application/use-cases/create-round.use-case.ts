import { Injectable } from "@nestjs/common";
import { Round } from "@/domain/entities/round.entity";
import { RoundsRepository } from "../repositories/rounds.repository";

export type CreateRoundInput = {
  roundId: string;
  crashMultiplierBps: number;
};

export type RoundOutput = {
  roundId: string;
  status: string;
  crashMultiplierBps: number;
  bettingStartedAt: string;
  runningStartedAt?: string;
  crashedAt?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class CreateRoundUseCase {
  constructor(private readonly roundsRepository: RoundsRepository) {}

  async execute(input: CreateRoundInput): Promise<RoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (currentRound) {
      throw new Error("There is already an active round");
    }

    const now = new Date();
    const round = new Round({
      id: input.roundId,
      crashMultiplierBps: input.crashMultiplierBps,
      bettingStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const savedRound = await this.roundsRepository.save(round);

    return toRoundOutput(savedRound);
  }
}

export const toRoundOutput = (round: Round): RoundOutput => ({
  roundId: round.id,
  status: round.getStatus(),
  crashMultiplierBps: round.crashMultiplierBps,
  bettingStartedAt: round.getBettingStartedAt().toISOString(),
  runningStartedAt: round.getRunningStartedAt()?.toISOString(),
  crashedAt: round.getCrashedAt()?.toISOString(),
  settledAt: round.getSettledAt()?.toISOString(),
  createdAt: round.getCreatedAt().toISOString(),
  updatedAt: round.getUpdatedAt().toISOString(),
});
