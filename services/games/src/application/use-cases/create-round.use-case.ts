import { Injectable } from "@nestjs/common";
import { Round } from "@/domain/entities/round.entity";
import { RoundsRepository } from "../repositories/rounds.repository";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

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
  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

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
    const output = toRoundOutput(savedRound);

    this.gameEventsPublisher.publish({
      name: "round.created",
      payload: {
        roundId: output.roundId,
        status: output.status,
        crashMultiplierBps: output.crashMultiplierBps,
        bettingStartedAt: output.bettingStartedAt,
      },
    });

    return output;
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
