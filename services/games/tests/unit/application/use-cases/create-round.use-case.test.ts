import { describe, expect, it } from "bun:test";
import { CreateRoundUseCase } from "@/application/use-cases/create-round.use-case";
import { FakeRoundsRepository } from "../../utils/wallet-client-fake";
import { Round } from "@/domain/entities/round.entity";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";

const makeRound = (): Round =>
  new Round({
    id: "round-active",
    crashMultiplierBps: 200,
    serverSeed: "server-seed",
    serverSeedHash: "server-seed-hash",
    clientSeed: "client-seed",
    nonce: 1,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

describe("CreateRoundUseCase", () => {
  it("creates a betting round when there is no active round", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    const provablyFairService = new ProvablyFairService();
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository, provablyFairService);

    const output = await createRoundUseCase.execute({
      roundId: "round-1",
      serverSeed: "server-seed",
      clientSeed: "client-seed",
      nonce: 1,
    });

    expect(output.roundId).toBe("round-1");
    expect(output.status).toBe("BETTING");
    expect(output.crashMultiplierBps).toBeUndefined();
    expect(output.serverSeedHash).toBe(provablyFairService.hashServerSeed("server-seed"));
    expect(output.serverSeed).toBeUndefined();
    expect(output.clientSeed).toBe("client-seed");
    expect(output.nonce).toBe(1);
    expect(output.bettingStartedAt).toBeString();
    expect(output.createdAt).toBeString();
    expect(output.updatedAt).toBeString();

    const currentRound = await roundsRepository.findCurrent();
    expect(currentRound?.id).toBe("round-1");
    expect(currentRound?.crashMultiplierBps).toBe(
      provablyFairService.calculateCrashMultiplierBps({
        serverSeed: "server-seed",
        clientSeed: "client-seed",
        nonce: 1,
      }),
    );
  });

  it("rejects when there is already an active round", async () => {
    const roundsRepository = new FakeRoundsRepository(makeRound());
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository);

    await expect(
      createRoundUseCase.execute({
        roundId: "round-2",
        serverSeed: "server-seed",
      }),
    ).rejects.toThrow("There is already an active round");
  });

  it("rejects invalid round input using domain rules", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository);

    await expect(
      createRoundUseCase.execute({
        roundId: "",
        serverSeed: "server-seed",
      }),
    ).rejects.toThrow("Round ID cannot be empty");

    await expect(
      createRoundUseCase.execute({
        roundId: "round-1",
        serverSeed: "",
      }),
    ).rejects.toThrow("serverSeed cannot be empty");
  });
});
