import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { AutomaticRoundEngineService } from "@/application/services/automatic-round-engine.service";
import { CreateRoundUseCase } from "@/application/use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "@/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "@/application/use-cases/crash-current-round.use-case";
import { SettleCurrentRoundUseCase } from "@/application/use-cases/settle-current-round.use-case";
import { FakeBetRepository, FakeRoundsRepository } from "../../utils/wallet-client-fake";
import { Round, type RoundProps } from "@/domain/entities/round.entity";
import { Bet } from "@/domain/entities/bet.entity";

const originalEnv = { ...process.env };

const makeRound = (overrides?: Partial<RoundProps>): Round =>
  new Round({
    id: "round-1",
    crashMultiplierBps: 250,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });

const makePlacedBet = (): Bet =>
  new Bet({
    id: "bet-1",
    playerId: "player-1",
    roundId: "round-1",
    amountCents: 250n,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

const makeEngine = (
  roundsRepository = new FakeRoundsRepository(null),
  betsRepository = new FakeBetRepository(),
) =>
  new AutomaticRoundEngineService(
    roundsRepository,
    new CreateRoundUseCase(roundsRepository),
    new StartCurrentRoundUseCase(roundsRepository),
    new CrashCurrentRoundUseCase(roundsRepository),
    new SettleCurrentRoundUseCase(roundsRepository, betsRepository),
  );

describe("AutomaticRoundEngineService", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GAMES_ENGINE_ENABLED: "false",
      GAMES_BETTING_WINDOW_MS: "10000",
      GAMES_SETTLEMENT_DELAY_MS: "2000",
      GAMES_MIN_CRASH_MULTIPLIER_BPS: "250",
      GAMES_MAX_CRASH_MULTIPLIER_BPS: "250",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates a new betting round when there is no active round", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    const engine = makeEngine(roundsRepository);

    await engine.tick(new Date("2026-01-01T00:00:00.000Z"));

    const currentRound = await roundsRepository.findCurrent();

    expect(currentRound?.getStatus()).toBe("BETTING");
    expect(currentRound?.crashMultiplierBps).toBe(250);
    expect(currentRound?.id).toStartWith("round-1767225600000-");
  });

  it("keeps a betting round open until the betting window expires", async () => {
    const roundsRepository = new FakeRoundsRepository(makeRound());
    const engine = makeEngine(roundsRepository);

    await engine.tick(new Date("2026-01-01T00:00:09.999Z"));

    const currentRound = await roundsRepository.findCurrent();

    expect(currentRound?.getStatus()).toBe("BETTING");
  });

  it("starts the current betting round after the betting window expires", async () => {
    const roundsRepository = new FakeRoundsRepository(makeRound());
    const engine = makeEngine(roundsRepository);

    await engine.tick(new Date("2026-01-01T00:00:10.000Z"));

    const currentRound = await roundsRepository.findCurrent();

    expect(currentRound?.getStatus()).toBe("RUNNING");
    expect(currentRound?.getRunningStartedAt()?.toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("crashes a running round when the current multiplier reaches the crash point", async () => {
    const runningRound = makeRound({
      status: "RUNNING",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
    });
    const roundsRepository = new FakeRoundsRepository(runningRound);
    const engine = makeEngine(roundsRepository);

    await engine.tick(new Date("2026-01-01T00:00:25.000Z"));

    const currentRound = await roundsRepository.findCurrent();

    expect(currentRound?.getStatus()).toBe("CRASHED");
    expect(currentRound?.getCrashedAt()?.toISOString()).toBe("2026-01-01T00:00:25.000Z");
  });

  it("keeps a crashed round visible until the settlement delay expires", async () => {
    const crashedRound = makeRound({
      status: "CRASHED",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
      crashedAt: new Date("2026-01-01T00:00:25.000Z"),
    });
    const roundsRepository = new FakeRoundsRepository(crashedRound);
    const engine = makeEngine(roundsRepository);

    await engine.tick(new Date("2026-01-01T00:00:26.999Z"));

    const currentRound = await roundsRepository.findCurrent();

    expect(currentRound?.getStatus()).toBe("CRASHED");
  });

  it("settles a crashed round and marks pending bets as lost after the settlement delay", async () => {
    const crashedRound = makeRound({
      status: "CRASHED",
      runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
      crashedAt: new Date("2026-01-01T00:00:25.000Z"),
    });
    const roundsRepository = new FakeRoundsRepository(crashedRound);
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makePlacedBet());
    const engine = makeEngine(roundsRepository, betsRepository);

    await engine.tick(new Date("2026-01-01T00:00:27.000Z"));

    const currentRound = await roundsRepository.findCurrent();
    const bet = await betsRepository.findByRoundIdAndPlayerId("round-1", "player-1");

    expect(currentRound).toBeNull();
    expect(bet?.getStatus()).toBe("LOST");
  });
});
