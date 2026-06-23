import { describe, expect, it } from "bun:test";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { FakeBetRepository, FakeWalletClient } from "../../utils/wallet-client-fake";
import type { WalletOperationResponse } from "@crash/contracts";

const successfulDebitResponse: WalletOperationResponse = {
  ok: true,
  transaction: {
    id: "transaction-1",
    operationId: "bet-debit:bet-1",
    type: "BET_DEBIT",
    amountCents: "250",
    currency: "BRL",
    balanceBeforeCents: "1000",
    balanceAfterCents: "750",
    referenceRoundId: "round-1",
    referenceBetId: "bet-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("PlaceBetUseCase", () => {
  it("debits the wallet using a deterministic operationId", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await placeBetUseCase.execute({
      playerId: "player-1",
      roundId: "round-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(walletClient.debitBetCalls).toEqual([
      {
        playerId: "player-1",
        operationId: "bet-debit:bet-1",
        amountCents: "250",
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      },
    ]);
  });

  it("returns an accepted bet when wallet debit succeeds", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    const output = await placeBetUseCase.execute({
      playerId: "player-1",
      roundId: "round-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(output).toEqual({
      accepted: true,
      betId: "bet-1",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: "250",
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "750",
    });
  });

  it("throws a game application error when wallet debit fails", async () => {
    const walletClient = new FakeWalletClient({
      ok: false,
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
      },
    });
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "500",
      }),
    ).rejects.toThrow("Wallet debit failed: INSUFFICIENT_BALANCE");
  });

  it("does not call wallet credit cashout when placing a bet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await placeBetUseCase.execute({
      playerId: "player-1",
      roundId: "round-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("rejects bets below the minimum before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "99",
      }),
    ).rejects.toThrow("Bet amount is below minimum");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("rejects bets above the maximum before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "100001",
      }),
    ).rejects.toThrow("Bet amount is above maximum");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("normalizes bet identifiers before sending the wallet debit", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = new PlaceBetUseCase(walletClient, betsRepository);

    await placeBetUseCase.execute({
      playerId: " player-1 ",
      roundId: " round-1 ",
      betId: " bet-1 ",
      amountCents: "250",
    });

    expect(walletClient.debitBetCalls).toEqual([
      {
        playerId: "player-1",
        operationId: "bet-debit:bet-1",
        amountCents: "250",
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      },
    ]);
  });
});
