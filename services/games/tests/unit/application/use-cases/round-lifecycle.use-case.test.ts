import { describe, expect, it } from "bun:test";
import { StartCurrentRoundUseCase } from "@/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "@/application/use-cases/crash-current-round.use-case";
import { SettleCurrentRoundUseCase } from "@/application/use-cases/settle-current-round.use-case";
import { Round, type RoundProps } from "@/domain/entities/round.entity";
import { Bet } from "@/domain/entities/bet.entity";
import { FakeBetRepository, FakeRoundsRepository } from "../../utils/wallet-client-fake";

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

const makePlacedBet = (id: string, playerId: string): Bet =>
  new Bet({
    id,
    playerId,
    roundId: "round-1",
    amountCents: 250n,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

describe("Round lifecycle use cases", () => {
  it("starts the current betting round", async () => {
    const roundsRepository = new FakeRoundsRepository(makeRound());
    const startCurrentRoundUseCase = new StartCurrentRoundUseCase(roundsRepository);

    const output = await startCurrentRoundUseCase.execute(
      new Date("2026-01-01T00:00:10.000Z"),
    );

    expect(output.status).toBe("RUNNING");
    expect(output.runningStartedAt).toBe("2026-01-01T00:00:10.000Z");

    const currentRound = await roundsRepository.findCurrent();
    expect(currentRound?.getStatus()).toBe("RUNNING");
  });

  it("rejects starting when there is no active round", async () => {
    const startCurrentRoundUseCase = new StartCurrentRoundUseCase(new FakeRoundsRepository(null));

    await expect(startCurrentRoundUseCase.execute()).rejects.toThrow("No active round");
  });

  it("crashes the current running round", async () => {
    const runningRound = makeRound({
      status: "RUNNING",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
    });
    const roundsRepository = new FakeRoundsRepository(runningRound);
    const crashCurrentRoundUseCase = new CrashCurrentRoundUseCase(roundsRepository);

    const output = await crashCurrentRoundUseCase.execute(
      new Date("2026-01-01T00:00:20.000Z"),
    );

    expect(output.status).toBe("CRASHED");
    expect(output.crashedAt).toBe("2026-01-01T00:00:20.000Z");
  });

  it("rejects crashing a round that is not running", async () => {
    const crashCurrentRoundUseCase = new CrashCurrentRoundUseCase(
      new FakeRoundsRepository(makeRound()),
    );

    await expect(crashCurrentRoundUseCase.execute()).rejects.toThrow(
      "Only running rounds can crash",
    );
  });

  it("settles the current crashed round and marks only pending bets as lost", async () => {
    const crashedRound = makeRound({
      status: "CRASHED",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
      crashedAt: new Date("2026-01-01T00:00:20.000Z"),
    });
    const roundsRepository = new FakeRoundsRepository(crashedRound);
    const betsRepository = new FakeBetRepository();
    const pendingBet = makePlacedBet("bet-pending", "player-1");
    const cashedOutBet = makePlacedBet("bet-cashout", "player-2");
    cashedOutBet.cashout(120, new Date("2026-01-01T00:00:12.000Z"));
    await betsRepository.create(pendingBet);
    await betsRepository.create(cashedOutBet);
    const settleCurrentRoundUseCase = new SettleCurrentRoundUseCase(
      roundsRepository,
      betsRepository,
    );

    const output = await settleCurrentRoundUseCase.execute(
      new Date("2026-01-01T00:00:30.000Z"),
    );

    const storedPendingBet = await betsRepository.findByRoundIdAndPlayerId("round-1", "player-1");
    const storedCashedOutBet = await betsRepository.findByRoundIdAndPlayerId("round-1", "player-2");

    expect(output.round.status).toBe("SETTLED");
    expect(output.lostBetsCount).toBe(1);
    expect(storedPendingBet?.getStatus()).toBe("LOST");
    expect(storedCashedOutBet?.getStatus()).toBe("CASHED_OUT");
  });

  it("rejects settling a round that has not crashed", async () => {
    const settleCurrentRoundUseCase = new SettleCurrentRoundUseCase(
      new FakeRoundsRepository(makeRound()),
      new FakeBetRepository(),
    );

    await expect(settleCurrentRoundUseCase.execute()).rejects.toThrow(
      "Only crashed rounds can be settled",
    );
  });
});
