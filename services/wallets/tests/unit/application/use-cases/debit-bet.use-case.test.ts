import { describe, expect, it } from "bun:test";
import { FakeClock, FakeIdGenerator, FakeWalletsRepository } from "./utils.use-case";
import { DebitBetUseCase } from "@/application/use-cases/debit-bet.use-case";
import { Wallet, WalletProps } from "@/domain/entities/wallet.entity";
import { Clock } from "@/application/providers/clock";

const makeInstances = (ids: string[]) => {
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator(ids);
  const repository = new FakeWalletsRepository();
  const debitBetUseCase = new DebitBetUseCase(repository, idGenerator, clock);

  return { clock, idGenerator, repository, debitBetUseCase };
};

const createWallet = async (
  repository: FakeWalletsRepository,
  clock: Clock,
  overrides?: Partial<WalletProps>,
): Promise<Wallet> => {
  const wallet = new Wallet({
    id: "wallet-1",
    playerId: "player-1",
    balanceCents: 1000n,
    currency: "BRL",
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  });

  await repository.save(wallet);

  return wallet;
};

describe("Check DebitBetUseCase works", () => {
  it("debits a bet and registers a BET_DEBIT transaction", async () => {
    const { clock, repository, debitBetUseCase } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock);

    await debitBetUseCase.execute({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(wallet.getBalanceCents()).toBe(700n);
    expect(repository.getWallets()).toHaveLength(1);
    expect(repository.getWalletTransactions()).toHaveLength(1);

    const savedTransaction = await repository.findWalletTransactionByOperationId("operation-1");
    expect(savedTransaction).toHaveProperty("type", "BET_DEBIT");
    expect(savedTransaction).toHaveProperty("currency", "BRL");
    expect(savedTransaction).toHaveProperty("amountCents", 300n);
    expect(savedTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(savedTransaction).toHaveProperty("balanceAfterCents", 700n);
    expect(savedTransaction).toHaveProperty("operationId", "operation-1");
    expect(savedTransaction).toHaveProperty("referenceRoundId", "round-1");
    expect(savedTransaction).toHaveProperty("referenceBetId", "bet-1");
  });

  it("debits wallets for different players using each wallet currency", async () => {
    const ids = ["1", "2"];
    const { clock, repository, debitBetUseCase } = makeInstances(ids);

    await createWallet(repository, clock, {
      id: "wallet-1",
      playerId: "player-1",
      currency: "BRL",
    });
    await createWallet(repository, clock, {
      id: "wallet-2",
      playerId: "player-2",
      currency: "USD",
    });

    await Promise.all(
      ids.map((id) => {
        return debitBetUseCase.execute({
          playerId: `player-${id}`,
          operationId: `operation-${id}`,
          amountCents: 300n,
          referenceRoundId: `round-${id}`,
          referenceBetId: `bet-${id}`,
        });
      }),
    );

    expect(repository.getWallets()).toHaveLength(2);
    expect(repository.getWalletTransactions()).toHaveLength(2);

    const transaction1 = await repository.findWalletTransactionByOperationId("operation-1");
    expect(transaction1).toHaveProperty("currency", "BRL");
    expect(transaction1).toHaveProperty("type", "BET_DEBIT");

    const transaction2 = await repository.findWalletTransactionByOperationId("operation-2");
    expect(transaction2).toHaveProperty("currency", "USD");
    expect(transaction2).toHaveProperty("type", "BET_DEBIT");
  });

  it("returns the existing transaction when operationId was already processed", async () => {
    const { clock, repository, debitBetUseCase } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock);

    const input = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const firstTransaction = await debitBetUseCase.execute(input);
    const secondTransaction = await debitBetUseCase.execute(input);

    expect(secondTransaction).toBe(firstTransaction);
    expect(wallet.getBalanceCents()).toBe(700n);
    expect(repository.getWalletTransactions()).toHaveLength(1);
    expect(firstTransaction).toHaveProperty("operationId", "operation-1");
    expect(firstTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(firstTransaction).toHaveProperty("balanceAfterCents", 700n);
  });

  it("debits wallet twice when operations are different", async () => {
    const { clock, repository, debitBetUseCase } = makeInstances(["1", "2"]);

    const wallet = await createWallet(repository, clock);

    await debitBetUseCase.execute({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    await debitBetUseCase.execute({
      playerId: "player-1",
      operationId: "operation-2",
      amountCents: 300n,
      referenceRoundId: "round-2",
      referenceBetId: "bet-2",
    });

    expect(wallet.getBalanceCents()).toBe(400n);
    expect(repository.getWalletTransactions()).toHaveLength(2);

    const firstTransaction = await repository.findWalletTransactionByOperationId("operation-1");
    const secondTransaction = await repository.findWalletTransactionByOperationId("operation-2");

    expect(firstTransaction).toHaveProperty("id", "transaction-1");
    expect(firstTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(firstTransaction).toHaveProperty("balanceAfterCents", 700n);

    expect(secondTransaction).toHaveProperty("id", "transaction-2");
    expect(secondTransaction).toHaveProperty("balanceBeforeCents", 700n);
    expect(secondTransaction).toHaveProperty("balanceAfterCents", 400n);
  });

  it("throws when wallet does not exist", async () => {
    const { repository, debitBetUseCase } = makeInstances(["1"]);

    await expect(
      debitBetUseCase.execute({
        playerId: "player-1",
        operationId: "operation-1",
        amountCents: 300n,
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      }),
    ).rejects.toThrow("Wallet not found");

    expect(repository.getWalletTransactions()).toHaveLength(0);
  });

  it("throws when balance is insufficient", async () => {
    const { clock, repository, debitBetUseCase } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock, { balanceCents: 0n });

    await expect(
      debitBetUseCase.execute({
        playerId: "player-1",
        operationId: "operation-1",
        amountCents: 300n,
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      }),
    ).rejects.toThrow("Insufficient balance");

    expect(wallet.getBalanceCents()).toBe(0n);
    expect(repository.getWalletTransactions()).toHaveLength(0);
  });
});
