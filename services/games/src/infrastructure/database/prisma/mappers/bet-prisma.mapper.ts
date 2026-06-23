import { Bet } from "@/domain/entities/bet.entity";
import type { Bet as PrismaBet } from "@generated/prisma/client";

export class BetPrismaMapper {
  static toDomain(raw: PrismaBet): Bet {
    return new Bet({
      id: raw.id,
      playerId: raw.playerId,
      roundId: raw.roundId,
      amountCents: raw.amountCents,
      status: raw.status,
      cashoutMultiplierBps: raw.cashoutMultiplierBps ?? undefined,
      payoutCents: raw.payoutCents ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(bet: Bet) {
    return {
      id: bet.id,
      playerId: bet.playerId,
      roundId: bet.roundId,
      amountCents: bet.amountCents,
      status: bet.getStatus(),
      cashoutMultiplierBps: bet.getCashoutMultiplierBps() ?? null,
      payoutCents: bet.getPayoutCents() ?? null,
      createdAt: bet.getCreatedAt(),
      updatedAt: bet.getUpdatedAt(),
    };
  }
}
