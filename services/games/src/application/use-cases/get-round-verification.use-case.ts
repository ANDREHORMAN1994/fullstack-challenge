import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";

export type RoundVerificationOutput = {
  roundId: string;
  status: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashMultiplierBps: number;
  verified: boolean;
};

@Injectable()
export class GetRoundVerificationUseCase {
  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  async execute(roundId: string): Promise<RoundVerificationOutput> {
    const round = await this.roundsRepository.findById(roundId);

    if (!round) {
      throw new Error("Round not found");
    }

    if (!["CRASHED", "SETTLED"].includes(round.getStatus())) {
      throw new Error("Round verification is only available after crash");
    }

    return {
      roundId: round.id,
      status: round.getStatus(),
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashMultiplierBps: round.crashMultiplierBps,
      verified: this.provablyFairService.verifyCrashPoint({
        serverSeed: round.serverSeed,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        nonce: round.nonce,
        crashMultiplierBps: round.crashMultiplierBps,
      }),
    };
  }
}
