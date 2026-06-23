import { describe, expect, it } from "bun:test";
import { GetCurrentRoundUseCase } from "@/application/use-cases/get-current-round.use-case";
import { FakeRoundsRepository } from "../../utils/wallet-client-fake";
import { Round } from "@/domain/entities/round.entity";

describe("GetCurrentRoundUseCase", () => {
  it("returns null when there is no active round", async () => {
    const getCurrentRoundUseCase = new GetCurrentRoundUseCase(new FakeRoundsRepository(null));

    const output = await getCurrentRoundUseCase.execute();

    expect(output).toBeNull();
  });

  it("returns the current active round", async () => {
    const round = new Round({
      id: "round-1",
      crashMultiplierBps: 250,
      bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const getCurrentRoundUseCase = new GetCurrentRoundUseCase(new FakeRoundsRepository(round));

    const output = await getCurrentRoundUseCase.execute();

    expect(output).toEqual({
      roundId: "round-1",
      status: "BETTING",
      crashMultiplierBps: 250,
      bettingStartedAt: "2026-01-01T00:00:00.000Z",
      runningStartedAt: undefined,
      crashedAt: undefined,
      settledAt: undefined,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
