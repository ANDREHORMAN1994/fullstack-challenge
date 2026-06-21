import { describe, expect, it } from "bun:test";
import { Wallet, WalletProps } from "@/domain/entities/wallet.entity";

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

describe("Wallet Entity", () => {
  it("creates a valid wallet", () => {
    const wallet = makeWallet();

    expect(wallet.id).toBe("wallet-123");
    expect(wallet.playerId).toBe("player-123");
    expect(wallet.getBalanceCents()).toBe(1000n);
    expect(wallet.currency).toBe("USD");
    expect(wallet.getCreatedAt()).toBeDate();
    expect(wallet.getUpdatedAt()).toBeDate();
  });

  it("normalizes ID and playerId by trimming whitespace", () => {
    const wallet = makeWallet({
      id: "   wallet-123   ",
      playerId: "   player-123   ",
    });

    expect(wallet.id).toBe("wallet-123");
    expect(wallet.playerId).toBe("player-123");
  });

  it("normalizes currency to uppercase", () => {
    const wallet = makeWallet({ currency: "usd" });
    expect(wallet.currency).toBe("USD");
  });

  it("rejects negative initial balance", () => {
    expect(() => makeWallet({ balanceCents: -100n })).toThrow("Balance cannot be negative");
  });

  it("rejects empty ID", () => {
    expect(() => makeWallet({ id: "   " })).toThrow("ID cannot be empty");
  });

  it("rejects empty playerId", () => {
    expect(() => makeWallet({ playerId: "   " })).toThrow("Player ID cannot be empty");
  });

  it("rejects empty currency", () => {
    expect(() => makeWallet({ currency: "   " })).toThrow("Currency cannot be empty");
  });

  it("debits when sufficient balance", () => {
    const wallet = makeWallet();
    wallet.debit(500n);
    expect(wallet.getBalanceCents()).toBe(500n);
  });

  it("rejects debit with zero/negative amount", () => {
    const wallet = makeWallet();
    expect(() => wallet.debit(0n)).toThrow("Amount must be greater than zero");
    expect(() => wallet.debit(-100n)).toThrow("Amount must be greater than zero");
  });

  it("rejects debit greater than balance", () => {
    const wallet = makeWallet();
    expect(() => wallet.debit(1500n)).toThrow("Insufficient balance");
  });

  it("credits positive amount", () => {
    const wallet = makeWallet();
    wallet.credit(500n);
    expect(wallet.getBalanceCents()).toBe(1500n);
  });

  it("rejects credit with zero/negative amount", () => {
    const wallet = makeWallet();
    expect(() => wallet.credit(0n)).toThrow("Amount must be greater than zero");
    expect(() => wallet.credit(-100n)).toThrow("Amount must be greater than zero");
  });
});
