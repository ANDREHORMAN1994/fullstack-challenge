import { describe, expect, it } from "bun:test";
import { CreateRoundUseCase } from "@/application/use-cases/create-round.use-case";
import { FakeRoundsRepository } from "../../utils/wallet-client-fake";
import { Round } from "@/domain/entities/round.entity";

const makeRound = (): Round =>
  new Round({
    id: "round-active",
    crashMultiplierBps: 200,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

describe("CreateRoundUseCase", () => {
  it("creates a betting round when there is no active round", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository);

    const output = await createRoundUseCase.execute({
      roundId: "round-1",
      crashMultiplierBps: 250,
    });

    expect(output.roundId).toBe("round-1");
    expect(output.status).toBe("BETTING");
    expect(output.crashMultiplierBps).toBe(250);
    expect(output.bettingStartedAt).toBeString();
    expect(output.createdAt).toBeString();
    expect(output.updatedAt).toBeString();

    const currentRound = await roundsRepository.findCurrent();
    expect(currentRound?.id).toBe("round-1");
  });

  it("rejects when there is already an active round", async () => {
    const roundsRepository = new FakeRoundsRepository(makeRound());
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository);

    await expect(
      createRoundUseCase.execute({
        roundId: "round-2",
        crashMultiplierBps: 250,
      }),
    ).rejects.toThrow("There is already an active round");
  });

  it("rejects invalid round input using domain rules", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    const createRoundUseCase = new CreateRoundUseCase(roundsRepository);

    await expect(
      createRoundUseCase.execute({
        roundId: "",
        crashMultiplierBps: 250,
      }),
    ).rejects.toThrow("Round ID cannot be empty");

    await expect(
      createRoundUseCase.execute({
        roundId: "round-1",
        crashMultiplierBps: 99,
      }),
    ).rejects.toThrow("Crash multiplier must be at least 1.00x");
  });
});
