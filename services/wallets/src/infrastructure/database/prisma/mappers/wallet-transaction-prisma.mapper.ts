import { WalletTransaction } from "@/domain/entities/wallet-transaction.entity";
import { WalletTransaction as PrismaWalletTransaction } from "@generated/prisma/client";

export class WalletTransactionPrismaMapper {
  static toDomain(prismaWallet: PrismaWalletTransaction): WalletTransaction {
    return new WalletTransaction({
      id: prismaWallet.id,
      operationId: prismaWallet.operationId,
      type: prismaWallet.type,
      amountCents: prismaWallet.amountCents,
      currency: prismaWallet.currency,
      balanceBeforeCents: prismaWallet.balanceBeforeCents,
      balanceAfterCents: prismaWallet.balanceAfterCents,
      referenceRoundId: prismaWallet.referenceRoundId ?? undefined,
      referenceBetId: prismaWallet.referenceBetId ?? undefined,
      createdAt: prismaWallet.createdAt,
    });
  }
}
