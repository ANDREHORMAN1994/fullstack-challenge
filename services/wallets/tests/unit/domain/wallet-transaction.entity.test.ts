import { describe, expect, it } from "bun:test";
import {
  WalletTransaction,
  WalletTransactionProps,
} from "@/domain/entities/wallet-transaction.entity";

const makeWalletTransaction = (overrides?: Partial<WalletTransactionProps>): WalletTransaction =>
  new WalletTransaction({
    id: "transaction-123",
    operationId: "operation-123",
    type: "BET_DEBIT",
    amountCents: 1000n,
    currency: "USD",
    balanceBeforeCents: 2000n,
    balanceAfterCents: 1000n,
    createdAt: new Date(),
    ...overrides,
  });

describe("WalletTransaction Entity", () => {
  it("creates a valid wallet transaction", () => {
    const transaction = makeWalletTransaction();

    expect(transaction.id).toBe("transaction-123");
    expect(transaction.operationId).toBe("operation-123");
    expect(transaction.type).toBe("BET_DEBIT");
    expect(transaction.amountCents).toBe(1000n);
    expect(transaction.currency).toBe("USD");
    expect(transaction.balanceBeforeCents).toBe(2000n);
    expect(transaction.balanceAfterCents).toBe(1000n);
    expect(transaction.getCreatedAt()).toBeDate();
  });

  it("allows optional referenceRoundId and referenceBetId", () => {
    const transaction = makeWalletTransaction({
      referenceRoundId: "round-123",
      referenceBetId: "bet-123",
    });

    expect(transaction.referenceRoundId).toBe("round-123");
    expect(transaction.referenceBetId).toBe("bet-123");
  });

  it("handles missing optional referenceRoundId and referenceBetId", () => {
    const transaction = makeWalletTransaction({
      referenceRoundId: undefined,
      referenceBetId: undefined,
    });

    expect(transaction.referenceRoundId).toBeUndefined();
    expect(transaction.referenceBetId).toBeUndefined();
  });

  it("normalizes ID and operationId by trimming whitespace", () => {
    const transaction = makeWalletTransaction({
      id: "   transaction-123   ",
      operationId: "   operation-123   ",
    });

    expect(transaction.id).toBe("transaction-123");
    expect(transaction.operationId).toBe("operation-123");
  });

  it("normalizes currency to uppercase", () => {
    const transaction = makeWalletTransaction({ currency: "usd" });
    expect(transaction.currency).toBe("USD");
  });

  it("rejects empty ID", () => {
    expect(() => makeWalletTransaction({ id: "   " })).toThrow("ID cannot be empty");
  });

  it("rejects empty operationId", () => {
    expect(() => makeWalletTransaction({ operationId: "   " })).toThrow(
      "Operation ID cannot be empty",
    );
  });

  it("rejects empty currency", () => {
    expect(() => makeWalletTransaction({ currency: "   " })).toThrow("Currency cannot be empty");
  });

  it("accepts valid transaction types", () => {
    const betDebitTransaction = makeWalletTransaction({
      type: "BET_DEBIT",
      amountCents: 100n,
      balanceBeforeCents: 200n,
      balanceAfterCents: 100n,
    });
    expect(betDebitTransaction.type).toBe("BET_DEBIT");

    const cashoutCreditTransaction = makeWalletTransaction({
      type: "CASHOUT_CREDIT",
      amountCents: 100n,
      balanceBeforeCents: 200n,
      balanceAfterCents: 300n,
    });
    expect(cashoutCreditTransaction.type).toBe("CASHOUT_CREDIT");
  });

  it("rejects invalid transaction types", () => {
    expect(() => makeWalletTransaction({ type: "INVALID_TYPE" as any })).toThrow(
      "Invalid transaction type",
    );
  });

  it("rejects negative amountCents", () => {
    expect(() => makeWalletTransaction({ amountCents: -100n })).toThrow(
      "Amount must be greater than zero",
    );
  });

  it("rejects zero amountCents", () => {
    expect(() => makeWalletTransaction({ amountCents: 0n })).toThrow(
      "Amount must be greater than zero",
    );
  });

  it("accepts positive amountCents", () => {
    const transaction = makeWalletTransaction({
      amountCents: 100n,
      balanceBeforeCents: 200n,
      balanceAfterCents: 100n,
    });
    expect(transaction.amountCents).toBe(100n);
  });

  it("rejects BET_DEBIT when balanceAfterCents does not match debit amount", () => {
    expect(() =>
      makeWalletTransaction({
        type: "BET_DEBIT",
        amountCents: 500n,
        balanceBeforeCents: 2000n,
        balanceAfterCents: 1600n,
      }),
    ).toThrow("Invalid balance after debit");
  });

  it("accepts BET_DEBIT when balanceAfterCents matches debit amount", () => {
    const transaction = makeWalletTransaction({
      type: "BET_DEBIT",
      amountCents: 500n,
      balanceBeforeCents: 2000n,
      balanceAfterCents: 1500n,
    });
    expect(transaction.balanceAfterCents).toBe(1500n);
  });

  it("accepts CASHOUT_CREDIT when balanceAfterCents matches credit amount", () => {
    const transaction = makeWalletTransaction({
      type: "CASHOUT_CREDIT",
      amountCents: 500n,
      balanceBeforeCents: 1000n,
      balanceAfterCents: 1500n,
    });
    expect(transaction.balanceAfterCents).toBe(1500n);
  });

  it("rejects CASHOUT_CREDIT when balanceAfterCents does not match credit amount", () => {
    expect(() =>
      makeWalletTransaction({
        type: "CASHOUT_CREDIT",
        amountCents: 500n,
        balanceBeforeCents: 1000n,
        balanceAfterCents: 1400n,
      }),
    ).toThrow("Invalid balance after credit");
  });

  it("rejects balanceBeforeCents or balanceAfterCents negative", () => {
    expect(() =>
      makeWalletTransaction({
        type: "CASHOUT_CREDIT",
        amountCents: 100n,
        balanceBeforeCents: -100n,
        balanceAfterCents: 0n,
      }),
    ).toThrow("Balance cannot be negative");

    expect(() =>
      makeWalletTransaction({
        type: "CASHOUT_CREDIT",
        amountCents: 100n,
        balanceBeforeCents: 0n,
        balanceAfterCents: -100n,
      }),
    ).toThrow("Balance cannot be negative");
  });

  it("allows zero balances", () => {
    const transaction = makeWalletTransaction({
      type: "CASHOUT_CREDIT",
      amountCents: 100n,
      balanceBeforeCents: 0n,
      balanceAfterCents: 100n,
    });
    expect(transaction.balanceBeforeCents).toBe(0n);
    expect(transaction.balanceAfterCents).toBe(100n);

    const transaction2 = makeWalletTransaction({
      type: "BET_DEBIT",
      amountCents: 100n,
      balanceBeforeCents: 100n,
      balanceAfterCents: 0n,
    });
    expect(transaction2.balanceBeforeCents).toBe(100n);
    expect(transaction2.balanceAfterCents).toBe(0n);
  });
});
