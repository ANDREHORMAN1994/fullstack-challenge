import { Round, type RoundProps } from "@/domain/entities/round.entity";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import { PrismaRoundsRepository } from "@/infrastructure/database/prisma/repositories/prisma-rounds.repository";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";

const makeRound = (overrides?: Partial<RoundProps>): Round =>
  new Round({
    id: "round-123",
    crashMultiplierBps: 250,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

describe("PrismaRoundsRepository", () => {
  const prisma = new PrismaService();
  const repository = new PrismaRoundsRepository(prisma);

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.round.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it("saves a betting round and finds it by id", async () => {
    const round = makeRound({
      id: "round-1",
      crashMultiplierBps: 175,
    });

    const savedRound = await repository.save(round);
    const foundRound = await repository.findById("round-1");

    expect(savedRound.id).toBe("round-1");
    expect(savedRound.crashMultiplierBps).toBe(175);
    expect(savedRound.getStatus()).toBe("BETTING");
    expect(savedRound.getBettingStartedAt()).toBeDate();

    expect(foundRound).not.toBeNull();
    expect(foundRound?.id).toBe("round-1");
    expect(foundRound?.crashMultiplierBps).toBe(175);
    expect(foundRound?.getStatus()).toBe("BETTING");
    expect(foundRound?.canAcceptBets()).toBe(true);
  });

  it("returns null when round does not exist", async () => {
    const foundRound = await repository.findById("round-missing");

    expect(foundRound).toBeNull();
  });

  it("updates a round lifecycle with upsert semantics", async () => {
    const round = makeRound({
      id: "round-1",
      crashMultiplierBps: 225,
    });

    await repository.save(round);

    round.startRunning(new Date("2026-01-01T00:00:10.000Z"));
    await repository.save(round);

    round.crash(new Date("2026-01-01T00:00:20.000Z"));
    await repository.save(round);

    const foundRound = await repository.findById("round-1");

    expect(foundRound).not.toBeNull();
    expect(foundRound?.getStatus()).toBe("CRASHED");
    expect(foundRound?.getRunningStartedAt()?.toISOString()).toBe("2026-01-01T00:00:10.000Z");
    expect(foundRound?.getCrashedAt()?.toISOString()).toBe("2026-01-01T00:00:20.000Z");
    expect(foundRound?.getSettledAt()).toBeUndefined();
  });

  it("finds the latest active round as current", async () => {
    await repository.save(
      makeRound({
        id: "round-old",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
    await repository.save(
      makeRound({
        id: "round-current",
        createdAt: new Date("2026-01-01T00:01:00.000Z"),
        updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      }),
    );

    const currentRound = await repository.findCurrent();

    expect(currentRound).not.toBeNull();
    expect(currentRound?.id).toBe("round-current");
  });

  it("ignores settled rounds when finding the current round", async () => {
    const settledRound = makeRound({
      id: "round-settled",
      createdAt: new Date("2026-01-01T00:02:00.000Z"),
      updatedAt: new Date("2026-01-01T00:02:00.000Z"),
    });

    settledRound.startRunning(new Date("2026-01-01T00:02:10.000Z"));
    settledRound.crash(new Date("2026-01-01T00:02:20.000Z"));
    settledRound.settle(new Date("2026-01-01T00:02:30.000Z"));

    await repository.save(
      makeRound({
        id: "round-current",
        createdAt: new Date("2026-01-01T00:01:00.000Z"),
        updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      }),
    );
    await repository.save(settledRound);

    const currentRound = await repository.findCurrent();

    expect(currentRound).not.toBeNull();
    expect(currentRound?.id).toBe("round-current");
  });

  it("returns null when there is no active current round", async () => {
    const settledRound = makeRound({
      id: "round-settled",
    });

    settledRound.startRunning(new Date("2026-01-01T00:00:10.000Z"));
    settledRound.crash(new Date("2026-01-01T00:00:20.000Z"));
    settledRound.settle(new Date("2026-01-01T00:00:30.000Z"));

    await repository.save(settledRound);

    const currentRound = await repository.findCurrent();

    expect(currentRound).toBeNull();
  });
});
