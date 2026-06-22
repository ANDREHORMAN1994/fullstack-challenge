import { describe, expect, it } from "bun:test";
import { CreditCashoutUseCase } from "@/application/use-cases/credit-cashout.use-case";
import { DebitBetUseCase } from "@/application/use-cases/debit-bet.use-case";
import { Clock } from "@/application/providers/clock";
import { Wallet, type WalletProps } from "@/domain/entities/wallet.entity";
import { WalletsMessageController } from "@/presentation/messaging/wallets-message.controller";
import {
  FakeClock,
  FakeIdGenerator,
  FakeWalletsRepository,
} from "../../utils/use-case-fakes";

const makeInstances = (ids: string[] = ["1", "2"]) => {
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator(ids);
  const repository = new FakeWalletsRepository();
  const debitBetUseCase = new DebitBetUseCase(repository, idGenerator, clock);
  const creditCashoutUseCase = new CreditCashoutUseCase(repository, idGenerator, clock);
  const controller = new WalletsMessageController(debitBetUseCase, creditCashoutUseCase);

  return { clock, repository, controller };
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

describe("WalletsMessageController", () => {
  it("returns ok true when debit bet message is processed", async () => {
    const { clock, repository, controller } = makeInstances(["1"]);

    await createWallet(repository, clock);

    const response = await controller.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response.ok).toBe(true);

    if (!response.ok) {
      throw new Error("Expected debit bet message to succeed");
    }

    expect(response.transaction).toEqual({
      id: "transaction-1",
      operationId: "operation-1",
      type: "BET_DEBIT",
      amountCents: "300",
      currency: "BRL",
      balanceBeforeCents: "1000",
      balanceAfterCents: "700",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns ok true when credit cashout message is processed", async () => {
    const { clock, repository, controller } = makeInstances(["1"]);

    await createWallet(repository, clock);

    const response = await controller.creditCashout({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response.ok).toBe(true);

    if (!response.ok) {
      throw new Error("Expected credit cashout message to succeed");
    }

    expect(response.transaction).toEqual({
      id: "transaction-1",
      operationId: "operation-1",
      type: "CASHOUT_CREDIT",
      amountCents: "300",
      currency: "BRL",
      balanceBeforeCents: "1000",
      balanceAfterCents: "1300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("maps missing wallet errors to WALLET_NOT_FOUND", async () => {
    const { controller } = makeInstances(["1"]);

    const response = await controller.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: "WALLET_NOT_FOUND",
        message: "Wallet not found",
      },
    });
  });

  it("maps insufficient balance errors to INSUFFICIENT_BALANCE", async () => {
    const { clock, repository, controller } = makeInstances(["1"]);

    await createWallet(repository, clock, { balanceCents: 100n });

    const response = await controller.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
      },
    });
  });

  it("maps invalid amountCents payloads to VALIDATION_ERROR", async () => {
    const { clock, repository, controller } = makeInstances(["1"]);

    await createWallet(repository, clock);

    const response = await controller.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "not-a-number",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid wallet operation payload",
      },
    });
  });

  it("keeps debit bet messages idempotent by operationId", async () => {
    const { clock, repository, controller } = makeInstances(["1"]);

    const wallet = await createWallet(repository, clock);

    const message = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "300",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const firstResponse = await controller.debitBet(message);
    const secondResponse = await controller.debitBet(message);

    expect(firstResponse).toEqual(secondResponse);
    expect(wallet.getBalanceCents()).toBe(700n);
    expect(repository.getWalletTransactions()).toHaveLength(1);
  });
});
