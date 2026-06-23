import { describe, expect, it } from "bun:test";
import { CashoutBetUseCase } from "@/application/use-cases/cashout-bet.use-case";
import { Bet } from "@/domain/entities/bet.entity";
import { Round, type RoundProps } from "@/domain/entities/round.entity";
import {
  FakeBetRepository,
  FakeGameEventsPublisher,
  FakeRoundsRepository,
  FakeWalletClient,
} from "../../utils/wallet-client-fake";
import type { WalletOperationResponse } from "@crash/contracts";

const successfulCreditResponse: WalletOperationResponse = {
  ok: true,
  transaction: {
    id: "transaction-1",
    operationId: "cashout-credit:bet-1",
    type: "CASHOUT_CREDIT",
    amountCents: "300",
    currency: "BRL",
    balanceBeforeCents: "750",
    balanceAfterCents: "1050",
    referenceRoundId: "round-1",
    referenceBetId: "bet-1",
    createdAt: "2026-01-01T00:00:02.000Z",
  },
};

const successfulDebitResponse: WalletOperationResponse = {
  ok: true,
  transaction: {
    id: "debit-transaction-1",
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

const makeRunningRound = (overrides?: Partial<RoundProps>): Round =>
  new Round({
    id: "round-1",
    status: "RUNNING",
    crashMultiplierBps: 250,
    serverSeed: "server-seed",
    serverSeedHash: "server-seed-hash",
    clientSeed: "client-seed",
    nonce: 1,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    runningStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

const makePlacedBet = () =>
  new Bet({
    id: "bet-1",
    playerId: "player-1",
    roundId: "round-1",
    amountCents: 250n,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

const makeCashoutBetUseCase = (
  walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse),
  betsRepository = new FakeBetRepository(),
  roundsRepository = new FakeRoundsRepository(makeRunningRound()),
  gameEventsPublisher = new FakeGameEventsPublisher(),
) => new CashoutBetUseCase(walletClient, betsRepository, roundsRepository, gameEventsPublisher);

describe("CashoutBetUseCase", () => {
  it("credits the wallet using a deterministic operationId and server-calculated payout", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(walletClient, betsRepository);

    const output = await cashoutBetUseCase.execute(
      { playerId: "player-1" },
      new Date("2026-01-01T00:00:02.000Z"),
    );

    expect(walletClient.creditCashoutCalls).toEqual([
      {
        playerId: "player-1",
        operationId: "cashout-credit:bet-1",
        amountCents: "300",
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
      },
    ]);
    expect(output).toEqual({
      cashedOut: true,
      betId: "bet-1",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: "250",
      cashoutMultiplierBps: 120,
      payoutCents: "300",
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "1050",
    });
  });

  it("normalizes the player identifier before finding and crediting the bet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(walletClient, betsRepository);

    await cashoutBetUseCase.execute(
      { playerId: " player-1 " },
      new Date("2026-01-01T00:00:02.000Z"),
    );

    expect(walletClient.creditCashoutCalls[0]?.playerId).toBe("player-1");
  });

  it("stores the bet as cashed out when wallet credit succeeds", async () => {
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(
      new FakeWalletClient(successfulDebitResponse, successfulCreditResponse),
      betsRepository,
    );

    await cashoutBetUseCase.execute(
      { playerId: "player-1" },
      new Date("2026-01-01T00:00:02.000Z"),
    );

    const savedBet = await betsRepository.findByRoundIdAndPlayerId("round-1", "player-1");

    expect(savedBet?.getStatus()).toBe("CASHED_OUT");
    expect(savedBet?.getCashoutMultiplierBps()).toBe(120);
    expect(savedBet?.getPayoutCents()).toBe(300n);
  });

  it("publishes a bet cashed out event when the bet is stored", async () => {
    const gameEventsPublisher = new FakeGameEventsPublisher();
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(
      new FakeWalletClient(successfulDebitResponse, successfulCreditResponse),
      betsRepository,
      new FakeRoundsRepository(makeRunningRound()),
      gameEventsPublisher,
    );

    await cashoutBetUseCase.execute(
      { playerId: "player-1" },
      new Date("2026-01-01T00:00:02.000Z"),
    );

    expect(gameEventsPublisher.events).toEqual([
      {
        name: "bet.cashed_out",
        payload: {
          betId: "bet-1",
          playerId: "player-1",
          roundId: "round-1",
          cashoutMultiplierBps: 120,
          payoutCents: "300",
        },
      },
    ]);
  });

  it("rejects when there is no active round before crediting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const cashoutBetUseCase = makeCashoutBetUseCase(
      walletClient,
      new FakeBetRepository(),
      new FakeRoundsRepository(null),
    );

    await expect(cashoutBetUseCase.execute({ playerId: "player-1" })).rejects.toThrow(
      "No active round",
    );

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("rejects when the current round is not accepting cashouts before crediting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const bettingRound = makeRunningRound({
      status: "BETTING",
      runningStartedAt: undefined,
    });
    const cashoutBetUseCase = makeCashoutBetUseCase(
      walletClient,
      new FakeBetRepository(),
      new FakeRoundsRepository(bettingRound),
    );

    await expect(cashoutBetUseCase.execute({ playerId: "player-1" })).rejects.toThrow(
      "Round is not accepting cashouts",
    );

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("rejects when the player has no bet in the current round before crediting the wallet", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const cashoutBetUseCase = makeCashoutBetUseCase(walletClient);

    await expect(cashoutBetUseCase.execute({ playerId: "player-1" })).rejects.toThrow(
      "Player has no bet in current round",
    );

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("rejects cashout after the server multiplier reaches the crash point before crediting", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, successfulCreditResponse);
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(walletClient, betsRepository);

    await expect(
      cashoutBetUseCase.execute({ playerId: "player-1" }, new Date("2026-01-01T00:00:15.000Z")),
    ).rejects.toThrow("Round has already reached the crash multiplier");

    expect(walletClient.creditCashoutCalls).toHaveLength(0);
  });

  it("throws a game application error when wallet credit fails", async () => {
    const walletClient = new FakeWalletClient(successfulDebitResponse, {
      ok: false,
      error: {
        code: "WALLET_NOT_FOUND",
        message: "Wallet not found",
      },
    });
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const cashoutBetUseCase = makeCashoutBetUseCase(walletClient, betsRepository);

    await expect(
      cashoutBetUseCase.execute({ playerId: "player-1" }, new Date("2026-01-01T00:00:02.000Z")),
    ).rejects.toThrow("Wallet cashout credit failed: WALLET_NOT_FOUND");
  });
});
