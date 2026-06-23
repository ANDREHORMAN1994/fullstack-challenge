import { Round } from "@/domain/entities/round.entity";
import type { Round as PrismaRound } from "@generated/prisma/client";

export class RoundPrismaMapper {
  static toDomain(raw: PrismaRound): Round {
    return new Round({
      id: raw.id,
      status: raw.status,
      crashMultiplierBps: raw.crashMultiplierBps,
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
      bettingStartedAt: round.getBettingStartedAt(),
      runningStartedAt: round.getRunningStartedAt() ?? null,
      crashedAt: round.getCrashedAt() ?? null,
      settledAt: round.getSettledAt() ?? null,
      createdAt: round.getCreatedAt(),
      updatedAt: round.getUpdatedAt(),
    };
  }
}
