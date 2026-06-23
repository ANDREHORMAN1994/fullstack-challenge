import { Round } from "@/domain/entities/round.entity";
import type { Round as PrismaRound } from "@generated/prisma/client";

export class RoundPrismaMapper {
  static toDomain(raw: PrismaRound): Round {
    return new Round({
      id: raw.id,
      status: raw.status,
      crashMultiplierBps: raw.crashMultiplierBps,
      serverSeed: raw.serverSeed,
      serverSeedHash: raw.serverSeedHash,
      clientSeed: raw.clientSeed,
      nonce: Number(raw.nonce),
      bettingStartedAt: raw.bettingStartedAt,
      runningStartedAt: raw.runningStartedAt ?? undefined,
      crashedAt: raw.crashedAt ?? undefined,
      settledAt: raw.settledAt ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(round: Round) {
    return {
      id: round.id,
      status: round.getStatus(),
      crashMultiplierBps: round.crashMultiplierBps,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      bettingStartedAt: round.getBettingStartedAt(),
      runningStartedAt: round.getRunningStartedAt() ?? null,
      crashedAt: round.getCrashedAt() ?? null,
      settledAt: round.getSettledAt() ?? null,
      createdAt: round.getCreatedAt(),
      updatedAt: round.getUpdatedAt(),
    };
  }
}
