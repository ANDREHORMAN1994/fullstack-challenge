import { describe, expect, it } from "bun:test";
import { WALLET_MESSAGE_PATTERNS, type WalletOperationResponse } from "@crash/contracts";
import { RabbitmqWalletClient } from "@/infrastructure/messaging/rabbitmq-wallet.client";
import { type ClientProxy } from "@nestjs/microservices";
import { of, type Observable } from "rxjs";

type SentMessage = {
  pattern: string;
  payload: unknown;
};

class FakeClientProxy {
  readonly sentMessages: SentMessage[] = [];

  constructor(private readonly response: WalletOperationResponse) {}

  send<TResponse, TInput>(pattern: string, payload: TInput): Observable<TResponse> {
    this.sentMessages.push({ pattern, payload });

    return of(this.response as TResponse);
  }
}

describe("RabbitmqWalletClient", () => {
  it("sends debit bet messages using the wallet debit pattern", async () => {
    const walletResponse: WalletOperationResponse = {
      ok: true,
      transaction: {
        id: "transaction-1",
        operationId: "operation-1",
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
    const fakeClient = new FakeClientProxy(walletResponse);
    const walletClient = new RabbitmqWalletClient(fakeClient as unknown as ClientProxy);

    const response = await walletClient.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "250",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual(walletResponse);
    expect(fakeClient.sentMessages).toEqual([
      {
        pattern: WALLET_MESSAGE_PATTERNS.DEBIT_BET,
        payload: {
          playerId: "player-1",
          operationId: "operation-1",
          amountCents: "250",
          referenceRoundId: "round-1",
          referenceBetId: "bet-1",
        },
      },
    ]);
  });

  it("sends credit cashout messages using the wallet credit pattern", async () => {
    const walletResponse: WalletOperationResponse = {
      ok: true,
      transaction: {
        id: "transaction-1",
        operationId: "operation-1",
        type: "CASHOUT_CREDIT",
        amountCents: "1000",
        currency: "BRL",
        balanceBeforeCents: "0",
        balanceAfterCents: "1000",
        referenceRoundId: "round-1",
        referenceBetId: "bet-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    };
    const fakeClient = new FakeClientProxy(walletResponse);
    const walletClient = new RabbitmqWalletClient(fakeClient as unknown as ClientProxy);

    const response = await walletClient.creditCashout({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "1000",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual(walletResponse);
    expect(fakeClient.sentMessages).toEqual([
      {
        pattern: WALLET_MESSAGE_PATTERNS.CREDIT_CASHOUT,
        payload: {
          playerId: "player-1",
          operationId: "operation-1",
          amountCents: "1000",
          referenceRoundId: "round-1",
          referenceBetId: "bet-1",
        },
      },
    ]);
  });

  it("returns wallet operation errors without throwing", async () => {
    const walletResponse: WalletOperationResponse = {
      ok: false,
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
      },
    };
    const fakeClient = new FakeClientProxy(walletResponse);
    const walletClient = new RabbitmqWalletClient(fakeClient as unknown as ClientProxy);

    const response = await walletClient.debitBet({
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "999999",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    });

    expect(response).toEqual(walletResponse);
  });
});
