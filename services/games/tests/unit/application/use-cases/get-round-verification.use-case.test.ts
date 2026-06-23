import { describe, expect, it } from "bun:test";
import { GetRoundVerificationUseCase } from "@/application/use-cases/get-round-verification.use-case";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";
import { Round } from "@/domain/entities/round.entity";
import { FakeRoundsRepository } from "../../utils/wallet-client-fake";

const provablyFairService = new ProvablyFairService();

const makeRound = (status: "BETTING" | "RUNNING" | "CRASHED" | "SETTLED" = "SETTLED") => {
  const serverSeed = "server-seed";
  const clientSeed = "round-1";
  const nonce = 1;
  const crashMultiplierBps = provablyFairService.calculateCrashMultiplierBps({
    serverSeed,
    clientSeed,
    nonce,
  });
  const baseDate = new Date("2026-01-01T00:00:00.000Z");

  return new Round({
    id: "round-1",
    status,
    crashMultiplierBps,
    serverSeed,
    serverSeedHash: provablyFairService.hashServerSeed(serverSeed),
    clientSeed,
    nonce,
    bettingStartedAt: baseDate,
    runningStartedAt: status === "BETTING" ? undefined : baseDate,
    crashedAt: ["CRASHED", "SETTLED"].includes(status) ? baseDate : undefined,
    settledAt: status === "SETTLED" ? baseDate : undefined,
    createdAt: baseDate,
    updatedAt: baseDate,
  });
};

describe("GetRoundVerificationUseCase", () => {
  it("returns verification data for a finished round", async () => {
    const useCase = new GetRoundVerificationUseCase(
      new FakeRoundsRepository(makeRound()),
      provablyFairService,
    );

    const output = await useCase.execute("round-1");

    expect(output).toMatchObject({
      roundId: "round-1",
      status: "SETTLED",
      serverSeed: "server-seed",
      clientSeed: "round-1",
      nonce: 1,
      verified: true,
    });
  });

  it("rejects missing rounds", async () => {
    const useCase = new GetRoundVerificationUseCase(
      new FakeRoundsRepository(null),
      provablyFairService,
    );

    await expect(useCase.execute("missing")).rejects.toThrow("Round not found");
  });

  it("does not reveal verification data before crash", async () => {
    const useCase = new GetRoundVerificationUseCase(
      new FakeRoundsRepository(makeRound("BETTING")),
      provablyFairService,
    );

    await expect(useCase.execute("round-1")).rejects.toThrow(
      "Round verification is only available after crash",
    );
  });
});
