import { Bet, type BetProps } from "@/domain/entities/bet.entity";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";
import { PrismaBetsRepository } from "@/infrastructure/database/prisma/repositories/prisma-bets.repository";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";

const makeBet = (overrides?: Partial<BetProps>): Bet =>
  new Bet({
    id: "bet-123",
    playerId: "player-123",
    roundId: "round-123",
    amountCents: 500n,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

describe("PrismaBetsRepository", () => {
  const prisma = new PrismaService();
  const repository = new PrismaBetsRepository(prisma);

  beforeAll(async () => {
    await prisma.onModuleInit();
  });

  beforeEach(async () => {
    await prisma.bet.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it("creates a placed bet and finds it by round and player", async () => {
    const bet = makeBet({
      id: "bet-1",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: 250n,
    });

    const savedBet = await repository.create(bet);
    const foundBet = await repository.findByRoundIdAndPlayerId("round-1", "player-1");

    expect(savedBet.id).toBe("bet-1");
    expect(savedBet.playerId).toBe("player-1");
    expect(savedBet.roundId).toBe("round-1");
    expect(savedBet.amountCents).toBe(250n);
    expect(savedBet.getStatus()).toBe("PLACED");

    expect(foundBet).not.toBeNull();
    expect(foundBet?.id).toBe("bet-1");
    expect(foundBet?.playerId).toBe("player-1");
    expect(foundBet?.roundId).toBe("round-1");
    expect(foundBet?.amountCents).toBe(250n);
    expect(foundBet?.getStatus()).toBe("PLACED");
    expect(foundBet?.getCreatedAt()).toBeDate();
    expect(foundBet?.getUpdatedAt()).toBeDate();
  });

  it("returns null when no bet exists for the round and player", async () => {
    const foundBet = await repository.findByRoundIdAndPlayerId("round-missing", "player-missing");

    expect(foundBet).toBeNull();
  });

  it("lists bets from a round ordered by creation date", async () => {
    await repository.create(
      makeBet({
        id: "bet-2",
        playerId: "player-2",
        roundId: "round-1",
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
        updatedAt: new Date("2026-01-01T00:00:02.000Z"),
      }),
    );
    await repository.create(
      makeBet({
        id: "bet-1",
        playerId: "player-1",
        roundId: "round-1",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        updatedAt: new Date("2026-01-01T00:00:01.000Z"),
      }),
    );
    await repository.create(
      makeBet({
        id: "bet-other-round",
        playerId: "player-3",
        roundId: "round-2",
      }),
    );

    const bets = await repository.findManyByRoundId("round-1");

    expect(bets.map((bet) => bet.id)).toEqual(["bet-1", "bet-2"]);
  });

  it("lists bets from a player ordered by latest creation date", async () => {
    await repository.create(
      makeBet({
        id: "bet-old",
        playerId: "player-1",
        roundId: "round-1",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        updatedAt: new Date("2026-01-01T00:00:01.000Z"),
      }),
    );
    await repository.create(
      makeBet({
        id: "bet-new",
        playerId: "player-1",
        roundId: "round-2",
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
        updatedAt: new Date("2026-01-01T00:00:02.000Z"),
      }),
    );
    await repository.create(
      makeBet({
        id: "bet-other-player",
        playerId: "player-2",
        roundId: "round-3",
      }),
    );

    const bets = await repository.findManyByPlayerId({
      playerId: "player-1",
      limit: 10,
      offset: 0,
    });

    expect(bets.map((bet) => bet.id)).toEqual(["bet-new", "bet-old"]);
  });

  it("paginates bets from a player", async () => {
    await repository.create(
      makeBet({
        id: "bet-old",
        playerId: "player-1",
        roundId: "round-1",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        updatedAt: new Date("2026-01-01T00:00:01.000Z"),
      }),
    );
    await repository.create(
      makeBet({
        id: "bet-new",
        playerId: "player-1",
        roundId: "round-2",
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
        updatedAt: new Date("2026-01-01T00:00:02.000Z"),
      }),
    );

    const bets = await repository.findManyByPlayerId({
      playerId: "player-1",
      limit: 1,
      offset: 1,
    });

    expect(bets.map((bet) => bet.id)).toEqual(["bet-old"]);
  });

  it("hydrates a cashed out bet with multiplier and payout", async () => {
    const bet = makeBet({
      id: "bet-cashed-out",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: 500n,
    });

    bet.cashout(250, new Date("2026-01-01T00:00:05.000Z"));

    await repository.create(bet);

    const foundBet = await repository.findByRoundIdAndPlayerId("round-1", "player-1");

    expect(foundBet).not.toBeNull();
    expect(foundBet?.getStatus()).toBe("CASHED_OUT");
    expect(foundBet?.getCashoutMultiplierBps()).toBe(250);
    expect(foundBet?.getPayoutCents()).toBe(1250n);
  });

  it("does not allow two different bets for the same player in the same round", async () => {
    await repository.create(
      makeBet({
        id: "bet-1",
        playerId: "player-1",
        roundId: "round-1",
      }),
    );

    await expect(
      repository.create(
        makeBet({
          id: "bet-2",
          playerId: "player-1",
          roundId: "round-1",
        }),
      ),
    ).rejects.toThrow();
  });
});
