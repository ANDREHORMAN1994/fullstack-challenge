import { Wallet } from "@/domain/entities/wallet.entity";
import { Wallet as PrismaWallet } from "@generated/prisma/client";

export class WalletPrismaMapper {
  static toDomain(prismaWallet: PrismaWallet): Wallet {
    return new Wallet({
      id: prismaWallet.id,
      playerId: prismaWallet.playerId,
      balanceCents: prismaWallet.balanceCents,
      currency: prismaWallet.currency,
      createdAt: prismaWallet.createdAt,
      updatedAt: prismaWallet.updatedAt,
    });
  }
}
