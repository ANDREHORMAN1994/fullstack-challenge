import { Injectable } from "@nestjs/common";
import { Round } from "@/domain/entities/round.entity";
import { RoundsRepository } from "../repositories/rounds.repository";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";

export type CreateRoundInput = {
  roundId: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
};

export type RoundOutput = {
  roundId: string;
  status: string;
  crashMultiplierBps?: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string;
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
    private readonly provablyFairService: ProvablyFairService = new ProvablyFairService(),
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

  async execute(input: CreateRoundInput): Promise<RoundOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (currentRound) {
      throw new Error("There is already an active round");
    }

    const now = new Date();
    const serverSeed = input.serverSeed ?? this.provablyFairService.generateServerSeed();
    const clientSeed = input.clientSeed ?? (input.roundId.trim() || "round-id-missing");
    const nonce = input.nonce ?? now.getTime();
    const serverSeedHash = this.provablyFairService.hashServerSeed(serverSeed);
    const crashMultiplierBps = this.provablyFairService.calculateCrashMultiplierBps({
      serverSeed,
      clientSeed,
      nonce,
    });
    const round = new Round({
      id: input.roundId,
      crashMultiplierBps,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
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
        serverSeedHash: output.serverSeedHash,
        clientSeed: output.clientSeed,
        nonce: output.nonce,
        bettingStartedAt: output.bettingStartedAt,
      },
    });

    return output;
  }
}

export const toRoundOutput = (round: Round): RoundOutput => ({
  roundId: round.id,
  status: round.getStatus(),
  crashMultiplierBps: ["CRASHED", "SETTLED"].includes(round.getStatus())
    ? round.crashMultiplierBps
    : undefined,
  serverSeedHash: round.serverSeedHash,
  clientSeed: round.clientSeed,
  nonce: round.nonce,
  serverSeed: ["CRASHED", "SETTLED"].includes(round.getStatus()) ? round.serverSeed : undefined,
  bettingStartedAt: round.getBettingStartedAt().toISOString(),
  runningStartedAt: round.getRunningStartedAt()?.toISOString(),
  crashedAt: round.getCrashedAt()?.toISOString(),
  settledAt: round.getSettledAt()?.toISOString(),
  createdAt: round.getCreatedAt().toISOString(),
  updatedAt: round.getUpdatedAt().toISOString(),
});
