import { describe, expect, it } from "bun:test";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import {
  FakeGameEventsPublisher,
  FakeBetRepository,
  FakeRoundsRepository,
  FakeWalletClient,
} from "../../utils/wallet-client-fake";
import { Round, type RoundProps } from "@/domain/entities/round.entity";
import { Bet } from "@/domain/entities/bet.entity";
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

const makeRound = (overrides?: Partial<RoundProps>): Round =>
  new Round({
    id: "round-1",
    crashMultiplierBps: 250,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

const makePlaceBetUseCase = (
  walletClient = new FakeWalletClient(successfulDebitResponse),
  betsRepository = new FakeBetRepository(),
  roundsRepository = new FakeRoundsRepository(makeRound()),
  gameEventsPublisher = new FakeGameEventsPublisher(),
) => new PlaceBetUseCase(walletClient, betsRepository, roundsRepository, gameEventsPublisher);

describe("PlaceBetUseCase", () => {
  it("debits the wallet using a deterministic operationId", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await placeBetUseCase.execute({
      playerId: "player-1",
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
    const placeBetUseCase = makePlaceBetUseCase();

    const output = await placeBetUseCase.execute({
      playerId: "player-1",
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

  it("publishes a bet placed event when the bet is stored", async () => {
    const gameEventsPublisher = new FakeGameEventsPublisher();
    const placeBetUseCase = makePlaceBetUseCase(
      new FakeWalletClient(successfulDebitResponse),
      new FakeBetRepository(),
      new FakeRoundsRepository(makeRound()),
      gameEventsPublisher,
    );

    await placeBetUseCase.execute({
      playerId: "player-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(gameEventsPublisher.events).toEqual([
      {
        name: "bet.placed",
        payload: {
          betId: "bet-1",
          playerId: "player-1",
          roundId: "round-1",
          amountCents: "250",
        },
      },
    ]);
  });

  it("throws a game application error when wallet debit fails", async () => {
    const walletClient = new FakeWalletClient({
      ok: false,
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
      },
    });
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-1",
        amountCents: "500",
      }),
    ).rejects.toThrow("Wallet debit failed: INSUFFICIENT_BALANCE");
  });

  it("does not call wallet credit cashout when placing a bet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await placeBetUseCase.execute({
      playerId: "player-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("rejects bets below the minimum before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-1",
        amountCents: "99",
      }),
    ).rejects.toThrow("Bet amount is below minimum");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("rejects bets above the maximum before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-1",
        amountCents: "100001",
      }),
    ).rejects.toThrow("Bet amount is above maximum");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("normalizes bet identifiers before sending the wallet debit", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(walletClient);

    await placeBetUseCase.execute({
      playerId: " player-1 ",
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

  it("stores the bet when wallet debit succeeds", async () => {
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = makePlaceBetUseCase(
      new FakeWalletClient(successfulDebitResponse),
      betsRepository,
    );

    await placeBetUseCase.execute({
      playerId: "player-1",
      betId: "bet-1",
      amountCents: "250",
    });

    expect(betsRepository.getBets()).toHaveLength(1);
    expect(betsRepository.getBets()[0]?.id).toBe("bet-1");
  });

  it("rejects when there is no active round before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const placeBetUseCase = makePlaceBetUseCase(
      walletClient,
      new FakeBetRepository(),
      new FakeRoundsRepository(null),
    );

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-1",
        amountCents: "250",
      }),
    ).rejects.toThrow("No active round");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("rejects when the current round is not accepting bets before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const runningRound = makeRound({
      status: "RUNNING",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
    });
    const placeBetUseCase = makePlaceBetUseCase(
      walletClient,
      new FakeBetRepository(),
      new FakeRoundsRepository(runningRound),
    );

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-1",
        amountCents: "250",
      }),
    ).rejects.toThrow("Round is not accepting bets");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });

  it("rejects a second bet from the same player in the same round before debiting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse);
    const betsRepository = new FakeBetRepository();
    const placeBetUseCase = makePlaceBetUseCase(walletClient, betsRepository);

    await betsRepository.create(
      new Bet({
        id: "existing-bet",
        playerId: "player-1",
        roundId: "round-1",
        amountCents: 250n,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await expect(
      placeBetUseCase.execute({
        playerId: "player-1",
        betId: "bet-2",
        amountCents: "250",
      }),
    ).rejects.toThrow("Player already placed a bet in this round");

    expect(walletClient.debitBetCalls).toHaveLength(0);
  });
});
