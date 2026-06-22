import { describe, expect, it } from "bun:test";
import { FakeClock, FakeIdGenerator, FakeWalletsRepository } from "./utils.use-case";
import { Wallet, WalletProps } from "@/domain/entities/wallet.entity";
import { Clock } from "@/application/providers/clock";
import { CreditCashoutUseCase } from "@/application/use-cases/credit-cashout.use-case";

const makeInstances = (ids: string[]) => {
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator(ids);
  const repository = new FakeWalletsRepository();
  const creditCashoutUseCase = new CreditCashoutUseCase(repository, idGenerator, clock);

  return { clock, idGenerator, repository, creditCashoutUseCase };
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

describe("Check CreditCashoutUseCase works", () => {
  it("credits a cashout and registers a CASHOUT_CREDIT transaction", async () => {
    const { clock, repository, creditCashoutUseCase } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock);

    await creditCashoutUseCase.execute({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(wallet.getBalanceCents()).toBe(1300n);
    expect(repository.getWallets()).toHaveLength(1);
    expect(repository.getWalletTransactions()).toHaveLength(1);

    const savedTransaction = await repository.findWalletTransactionByOperationId("operation-1");
    expect(savedTransaction).toHaveProperty("type", "CASHOUT_CREDIT");
    expect(savedTransaction).toHaveProperty("currency", "BRL");
    expect(savedTransaction).toHaveProperty("amountCents", 300n);
    expect(savedTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(savedTransaction).toHaveProperty("balanceAfterCents", 1300n);
    expect(savedTransaction).toHaveProperty("operationId", "operation-1");
    expect(savedTransaction).toHaveProperty("referenceRoundId", "round-1");
    expect(savedTransaction).toHaveProperty("referenceBetId", "bet-1");
  });

  it("returns the existing transaction when operationId was already processed", async () => {
    const { clock, repository, creditCashoutUseCase } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock);

    const input = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const firstTransaction = await creditCashoutUseCase.execute(input);
    const secondTransaction = await creditCashoutUseCase.execute(input);

    expect(secondTransaction).toBe(firstTransaction);
    expect(wallet.getBalanceCents()).toBe(1300n);
    expect(repository.getWalletTransactions()).toHaveLength(1);
    expect(firstTransaction).toHaveProperty("operationId", "operation-1");
    expect(firstTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(firstTransaction).toHaveProperty("balanceAfterCents", 1300n);
  });

  it("credits wallet twice when operations are different", async () => {
    const { clock, repository, creditCashoutUseCase } = makeInstances(["1", "2"]);

    const wallet = await createWallet(repository, clock);

    await creditCashoutUseCase.execute({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: 300n,
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    await creditCashoutUseCase.execute({
      playerId: "player-1",
      operationId: "operation-2",
      amountCents: 300n,
      referenceRoundId: "round-2",
      referenceBetId: "bet-2",
    });

    expect(wallet.getBalanceCents()).toBe(1600n);
    expect(repository.getWalletTransactions()).toHaveLength(2);

    const firstTransaction = await repository.findWalletTransactionByOperationId("operation-1");
    const secondTransaction = await repository.findWalletTransactionByOperationId("operation-2");

    expect(firstTransaction).toHaveProperty("id", "transaction-1");
    expect(firstTransaction).toHaveProperty("balanceBeforeCents", 1000n);
    expect(firstTransaction).toHaveProperty("balanceAfterCents", 1300n);

    expect(secondTransaction).toHaveProperty("id", "transaction-2");
    expect(secondTransaction).toHaveProperty("balanceBeforeCents", 1300n);
    expect(secondTransaction).toHaveProperty("balanceAfterCents", 1600n);
  });

  it("throws when wallet does not exist", async () => {
    const { repository, creditCashoutUseCase } = makeInstances(["1"]);

    await expect(
      creditCashoutUseCase.execute({
        playerId: "player-1",
        operationId: "operation-1",
        amountCents: 300n,
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      }),
    ).rejects.toThrow("Wallet not found");

    expect(repository.getWalletTransactions()).toHaveLength(0);
  });
});
