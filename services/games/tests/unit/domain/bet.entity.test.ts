import { describe, expect, it } from "bun:test";
import { Bet, type BetProps } from "@/domain/entities/bet.entity";

const makeBet = (overrides?: Partial<BetProps>): Bet => {
  return new Bet({
    id: "bet-1",
    playerId: "player-1",
    roundId: "round-1",
    amountCents: 250n,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
};

describe("Bet Entity", () => {
  it("creates a valid placed bet", () => {
    const bet = makeBet();

    expect(bet.id).toBe("bet-1");
    expect(bet.playerId).toBe("player-1");
    expect(bet.roundId).toBe("round-1");
    expect(bet.amountCents).toBe(250n);
    expect(bet.getStatus()).toBe("PLACED");
    expect(bet.getCashoutMultiplierBps()).toBeUndefined();
    expect(bet.getPayoutCents()).toBeUndefined();
    expect(bet.getCreatedAt().toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(bet.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("normalizes string identifiers by trimming whitespace", () => {
    const bet = makeBet({
      id: " bet-1 ",
      playerId: " player-1 ",
      roundId: " round-1 ",
    });

    expect(bet.id).toBe("bet-1");
    expect(bet.playerId).toBe("player-1");
    expect(bet.roundId).toBe("round-1");
  });

  it("rejects empty identifiers", () => {
    expect(() => makeBet({ id: "" })).toThrow("Bet ID cannot be empty");
    expect(() => makeBet({ playerId: "" })).toThrow("Player ID cannot be empty");
    expect(() => makeBet({ roundId: "" })).toThrow("Round ID cannot be empty");
  });

  it("rejects bet amounts below the minimum", () => {
    expect(() => makeBet({ amountCents: 99n })).toThrow("Bet amount is below minimum");
  });

  it("accepts the minimum bet amount", () => {
    const bet = makeBet({ amountCents: 100n });

    expect(bet.amountCents).toBe(100n);
  });

  it("rejects bet amounts above the maximum", () => {
    expect(() => makeBet({ amountCents: 100001n })).toThrow("Bet amount is above maximum");
  });

  it("accepts the maximum bet amount", () => {
    const bet = makeBet({ amountCents: 100000n });

    expect(bet.amountCents).toBe(100000n);
  });

  it("rejects invalid bet statuses", () => {
    expect(() =>
      makeBet({
        status: "INVALID" as "PLACED",
      }),
    ).toThrow("Invalid bet status");
  });

  it("cashes out a placed bet and calculates payout using integer multiplier bps", () => {
    const bet = makeBet({ amountCents: 250n });

    const payoutCents = bet.cashout(150, new Date("2026-01-01T00:00:10.000Z"));

    expect(payoutCents).toBe(375n);
    expect(bet.getStatus()).toBe("CASHED_OUT");
    expect(bet.getCashoutMultiplierBps()).toBe(150);
    expect(bet.getPayoutCents()).toBe(375n);
    expect(bet.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("supports exact 1.00x cashout", () => {
    const bet = makeBet({ amountCents: 250n });

    const payoutCents = bet.cashout(100);

    expect(payoutCents).toBe(250n);
  });

  it("rejects cashout below 1.00x", () => {
    const bet = makeBet();

    expect(() => bet.cashout(99)).toThrow("Cashout multiplier must be at least 1.00x");
  });

  it("rejects non-integer cashout multipliers", () => {
    const bet = makeBet();

    expect(() => bet.cashout(150.5)).toThrow("Cashout multiplier must be at least 1.00x");
  });

  it("does not allow cashout twice", () => {
    const bet = makeBet();

    bet.cashout(150);

    expect(() => bet.cashout(200)).toThrow("Only placed bets can be cashed out");
  });

  it("marks a placed bet as lost", () => {
    const bet = makeBet();

    bet.markAsLost(new Date("2026-01-01T00:00:10.000Z"));

    expect(bet.getStatus()).toBe("LOST");
    expect(bet.getPayoutCents()).toBeUndefined();
    expect(bet.getCashoutMultiplierBps()).toBeUndefined();
    expect(bet.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("does not allow a cashed out bet to be marked as lost", () => {
    const bet = makeBet();

    bet.cashout(150);

    expect(() => bet.markAsLost()).toThrow("Only placed bets can be marked as lost");
  });

  it("does not allow a lost bet to be cashed out", () => {
    const bet = makeBet();

    bet.markAsLost();

    expect(() => bet.cashout(150)).toThrow("Only placed bets can be cashed out");
  });

  it("hydrates a valid cashed out bet", () => {
    const bet = makeBet({
      status: "CASHED_OUT",
      cashoutMultiplierBps: 225,
      payoutCents: 562n,
    });

    expect(bet.getStatus()).toBe("CASHED_OUT");
    expect(bet.getCashoutMultiplierBps()).toBe(225);
    expect(bet.getPayoutCents()).toBe(562n);
  });

  it("rejects cashed out bets without cashout data", () => {
    expect(() => makeBet({ status: "CASHED_OUT" })).toThrow(
      "Cashed out bets must have a valid multiplier",
    );
  });

  it("rejects placed or lost bets with cashout data", () => {
    expect(() =>
      makeBet({
        status: "PLACED",
        cashoutMultiplierBps: 150,
        payoutCents: 375n,
      }),
    ).toThrow("Only cashed out bets can have cashout data");

    expect(() =>
      makeBet({
        status: "LOST",
        cashoutMultiplierBps: 150,
        payoutCents: 375n,
      }),
    ).toThrow("Only cashed out bets can have cashout data");
  });
});
