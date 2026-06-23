import { describe, expect, it } from "bun:test";
import { Round, type RoundProps } from "@/domain/entities/round.entity";

const makeRound = (overrides?: Partial<RoundProps>): Round =>
  new Round({
    id: "round-1",
    crashMultiplierBps: 250,
    serverSeed: "server-seed",
    serverSeedHash: "server-seed-hash",
    clientSeed: "client-seed",
    nonce: 1,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

describe("Round Entity", () => {
  it("creates a valid betting round", () => {
    const round = makeRound();

    expect(round.id).toBe("round-1");
    expect(round.crashMultiplierBps).toBe(250);
    expect(round.serverSeed).toBe("server-seed");
    expect(round.serverSeedHash).toBe("server-seed-hash");
    expect(round.clientSeed).toBe("client-seed");
    expect(round.nonce).toBe(1);
    expect(round.getStatus()).toBe("BETTING");
    expect(round.canAcceptBets()).toBe(true);
    expect(round.canCashout()).toBe(false);
    expect(round.getBettingStartedAt().toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(round.getRunningStartedAt()).toBeUndefined();
    expect(round.getCrashedAt()).toBeUndefined();
    expect(round.getSettledAt()).toBeUndefined();
  });

  it("normalizes the round identifier", () => {
    const round = makeRound({ id: " round-1 " });

    expect(round.id).toBe("round-1");
  });

  it("rejects invalid identifiers and crash multipliers", () => {
    expect(() => makeRound({ id: "" })).toThrow("Round ID cannot be empty");
    expect(() => makeRound({ crashMultiplierBps: 99 })).toThrow(
      "Crash multiplier must be at least 1.00x",
    );
    expect(() => makeRound({ crashMultiplierBps: 150.5 })).toThrow(
      "Crash multiplier must be at least 1.00x",
    );
  });

  it("rejects invalid provably fair fields", () => {
    expect(() => makeRound({ serverSeed: "" })).toThrow("Server seed cannot be empty");
    expect(() => makeRound({ serverSeedHash: "" })).toThrow("Server seed hash cannot be empty");
    expect(() => makeRound({ clientSeed: "" })).toThrow("Client seed cannot be empty");
    expect(() => makeRound({ nonce: -1 })).toThrow("Nonce must be a non-negative integer");
    expect(() => makeRound({ nonce: 1.5 })).toThrow("Nonce must be a non-negative integer");
  });

  it("rejects invalid round status", () => {
    expect(() =>
      makeRound({
        status: "INVALID" as "BETTING",
      }),
    ).toThrow("Invalid round status");
  });

  it("starts a betting round", () => {
    const round = makeRound();

    round.startRunning(new Date("2026-01-01T00:00:10.000Z"));

    expect(round.getStatus()).toBe("RUNNING");
    expect(round.canAcceptBets()).toBe(false);
    expect(round.canCashout()).toBe(true);
    expect(round.getRunningStartedAt()?.toISOString()).toBe("2026-01-01T00:00:10.000Z");
    expect(round.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("crashes a running round", () => {
    const round = makeRound();

    round.startRunning(new Date("2026-01-01T00:00:10.000Z"));
    round.crash(new Date("2026-01-01T00:00:20.000Z"));

    expect(round.getStatus()).toBe("CRASHED");
    expect(round.canAcceptBets()).toBe(false);
    expect(round.canCashout()).toBe(false);
    expect(round.getCrashedAt()?.toISOString()).toBe("2026-01-01T00:00:20.000Z");
    expect(round.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:20.000Z");
  });

  it("settles a crashed round", () => {
    const round = makeRound();

    round.startRunning(new Date("2026-01-01T00:00:10.000Z"));
    round.crash(new Date("2026-01-01T00:00:20.000Z"));
    round.settle(new Date("2026-01-01T00:00:30.000Z"));

    expect(round.getStatus()).toBe("SETTLED");
    expect(round.canAcceptBets()).toBe(false);
    expect(round.canCashout()).toBe(false);
    expect(round.getSettledAt()?.toISOString()).toBe("2026-01-01T00:00:30.000Z");
    expect(round.getUpdatedAt().toISOString()).toBe("2026-01-01T00:00:30.000Z");
  });

  it("rejects transitions out of order", () => {
    const round = makeRound();

    expect(() => round.crash()).toThrow("Only running rounds can crash");
    expect(() => round.settle()).toThrow("Only crashed rounds can be settled");

    round.startRunning();

    expect(() => round.startRunning()).toThrow("Only betting rounds can start running");

    round.crash();

    expect(() => round.crash()).toThrow("Only running rounds can crash");

    round.settle();

    expect(() => round.settle()).toThrow("Only crashed rounds can be settled");
  });

  it("exposes explicit guards for betting and cashout phases", () => {
    const round = makeRound();

    expect(() => round.ensureAcceptsBets()).not.toThrow();
    expect(() => round.ensureAcceptsCashout()).toThrow("Round is not accepting cashouts");

    round.startRunning();

    expect(() => round.ensureAcceptsBets()).toThrow("Round is not accepting bets");
    expect(() => round.ensureAcceptsCashout()).not.toThrow();
  });

  it("hydrates a running round only when running timestamp is present", () => {
    expect(() =>
      makeRound({
        status: "RUNNING",
      }),
    ).toThrow("Running rounds must have a running start timestamp");

    const round = makeRound({
      status: "RUNNING",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
    });

    expect(round.getStatus()).toBe("RUNNING");
    expect(round.getRunningStartedAt()?.toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("hydrates crashed and settled rounds only with the required timestamps", () => {
    expect(() =>
      makeRound({
        status: "CRASHED",
        runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
      }),
    ).toThrow("Crashed rounds must have running and crash timestamps");

    expect(() =>
      makeRound({
        status: "SETTLED",
        runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
        crashedAt: new Date("2026-01-01T00:00:20.000Z"),
      }),
    ).toThrow("Settled rounds must have running, crash, and settlement timestamps");

    const round = makeRound({
      status: "SETTLED",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
      crashedAt: new Date("2026-01-01T00:00:20.000Z"),
      settledAt: new Date("2026-01-01T00:00:30.000Z"),
    });

    expect(round.getStatus()).toBe("SETTLED");
    expect(round.getSettledAt()?.toISOString()).toBe("2026-01-01T00:00:30.000Z");
  });
});
