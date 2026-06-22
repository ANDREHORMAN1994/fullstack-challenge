import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { Wallet } from "@/domain/entities/wallet.entity";
import { PrismaService } from "../prisma.service";
import { WalletPrismaMapper } from "../mappers/wallet-prisma.mapper";
import { WalletTransaction } from "@/domain/entities/wallet-transaction.entity";
import { WalletTransactionPrismaMapper } from "../mappers/wallet-transaction-prisma.mapper";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaWalletsRepository extends WalletsRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!wallet) return null;

    return WalletPrismaMapper.toDomain(wallet);
  }

  async findById(id: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
    });

    if (!wallet) return null;

    return WalletPrismaMapper.toDomain(wallet);
  }

  async save(wallet: Wallet): Promise<void> {
    await this.prisma.wallet.upsert({
      where: { id: wallet.id },
      create: {
        id: wallet.id,
        playerId: wallet.playerId,
        balanceCents: wallet.getBalanceCents(),
        currency: wallet.currency,
        createdAt: wallet.getCreatedAt(),
        updatedAt: wallet.getUpdatedAt(),
      },
      update: {
        playerId: wallet.playerId,
        balanceCents: wallet.getBalanceCents(),
        currency: wallet.currency,
        updatedAt: wallet.getUpdatedAt(),
      },
    });
  }

  async findWalletTransactionByOperationId(operationId: string): Promise<WalletTransaction | null> {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { operationId },
    });

    if (!transaction) return null;

    return WalletTransactionPrismaMapper.toDomain(transaction);
  }

  async saveWalletTransaction(wallet: Wallet, transaction: WalletTransaction): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.walletTransaction.create({
        data: {
          id: transaction.id,
          operationId: transaction.operationId,
          type: transaction.type,
          amountCents: transaction.amountCents,
          currency: transaction.currency,
          balanceBeforeCents: transaction.balanceBeforeCents,
          balanceAfterCents: transaction.balanceAfterCents,
          referenceRoundId: transaction.referenceRoundId ?? null,
          referenceBetId: transaction.referenceBetId ?? null,
          createdAt: transaction.getCreatedAt(),
          wallet: {
            connect: {
              id: wallet.id,
            },
          },
        },
      });

      await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balanceCents: wallet.getBalanceCents(),
          currency: wallet.currency,
          updatedAt: wallet.getUpdatedAt(),
        },
      });
    });
  }
}
