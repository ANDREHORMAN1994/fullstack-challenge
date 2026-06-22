import {
  WalletTransaction,
  WalletTransactionProps,
} from "@/domain/entities/wallet-transaction.entity";
import { Wallet, WalletProps } from "@/domain/entities/wallet.entity";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import { PrismaWalletsRepository } from "@/infrastructure/database/prisma/repositories/prisma-wallets.repository";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";

const makeWallet = (overrides?: Partial<WalletProps>): Wallet =>
  new Wallet({
    id: "wallet-123",
    playerId: "player-123",
    balanceCents: 1000n,
    currency: "USD",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeWalletTransaction = (overrides?: Partial<WalletTransactionProps>): WalletTransaction =>
  new WalletTransaction({
    id: "transaction-123",
    operationId: "operation-123",
    type: "BET_DEBIT",
    amountCents: 500n,
    currency: "USD",
    balanceBeforeCents: 1000n,
    balanceAfterCents: 500n,
    createdAt: new Date(),
    ...overrides,
  });

describe("Check integration among Repository + Prisma + Postgres", () => {
  const prisma = new PrismaService();
  const repository = new PrismaWalletsRepository(prisma);

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it("save wallet and check by ID", async () => {
    const wallet = makeWallet({
      id: "wallet-1",
      playerId: "player-1",
      currency: "USD",
    });

    await repository.save(wallet);

    const foundWallet = await repository.findById(wallet.id);

    expect(foundWallet).not.toBeNull();
    expect(foundWallet?.id).toBe("wallet-1");
    expect(foundWallet?.playerId).toBe("player-1");
    expect(foundWallet?.currency).toBe("USD");
    expect(foundWallet?.getBalanceCents()).toBe(1000n);
    expect(foundWallet?.getCreatedAt()).toBeDate();
    expect(foundWallet?.getUpdatedAt()).toBeDate();
  });

  it("save wallet and check by player ID", async () => {
    const wallet = makeWallet({
      id: "wallet-2",
      playerId: "player-2",
      currency: "BRL",
    });

    await repository.save(wallet);

    const foundWallet = await repository.findByPlayerId(wallet.playerId);

    expect(foundWallet).not.toBeNull();
    expect(foundWallet?.id).toBe("wallet-2");
    expect(foundWallet?.playerId).toBe("player-2");
    expect(foundWallet?.currency).toBe("BRL");
    expect(foundWallet?.getBalanceCents()).toBe(1000n);
    expect(foundWallet?.getCreatedAt()).toBeDate();
    expect(foundWallet?.getUpdatedAt()).toBeDate();
  });

  it("returns null when wallet transaction operationId does not exist", async () => {
    const foundTransaction = await repository.findWalletTransactionByOperationId("operation-not-found");
    expect(foundTransaction).toBeNull();
  });

  it("saves wallet transaction atomically and updates wallet balance", async () => {
    const wallet = makeWallet({
      id: "wallet-1",
      playerId: "player-1",
      currency: "BRL",
      balanceCents: 1000n,
    });

    await repository.save(wallet);

    const balanceBeforeCents = wallet.getBalanceCents();

    wallet.debit(150n);

    const transaction = makeWalletTransaction({
      id: "transaction-1",
      operationId: "operation-1",
      type: "BET_DEBIT",
      amountCents: 150n,
      currency: "BRL",
      balanceBeforeCents,
      balanceAfterCents: wallet.getBalanceCents(),
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    await repository.saveWalletTransaction(wallet, transaction);

    const updatedWallet = await repository.findById(wallet.id);
    const foundTransaction = await repository.findWalletTransactionByOperationId("operation-1");

    expect(updatedWallet).not.toBeNull();
    expect(updatedWallet?.getBalanceCents()).toBe(850n);

    expect(foundTransaction).not.toBeNull();
    expect(foundTransaction?.id).toBe("transaction-1");
    expect(foundTransaction?.operationId).toBe("operation-1");
    expect(foundTransaction?.type).toBe("BET_DEBIT");
    expect(foundTransaction?.amountCents).toBe(150n);
    expect(foundTransaction?.currency).toBe("BRL");
    expect(foundTransaction?.balanceBeforeCents).toBe(1000n);
    expect(foundTransaction?.balanceAfterCents).toBe(850n);
    expect(foundTransaction?.referenceRoundId).toBe("round-1");
    expect(foundTransaction?.referenceBetId).toBe("bet-1");

    const persistedTransaction = await prisma.walletTransaction.findUnique({
      where: { operationId: "operation-1" },
    });

    expect(persistedTransaction?.walletId).toBe("wallet-1");
  });
});
