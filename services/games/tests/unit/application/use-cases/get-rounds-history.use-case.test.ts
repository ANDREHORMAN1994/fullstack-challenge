import { describe, expect, it } from "bun:test";
import { GetRoundsHistoryUseCase } from "@/application/use-cases/get-rounds-history.use-case";
import { Round } from "@/domain/entities/round.entity";
import { FakeRoundsRepository } from "../../utils/wallet-client-fake";

const makeSettledRound = (id: string, crashedAt: Date): Round =>
  new Round({
    id,
    status: "SETTLED",
    crashMultiplierBps: 250,
    serverSeed: `${id}-server-seed`,
    serverSeedHash: `${id}-server-seed-hash`,
    clientSeed: id,
    nonce: 1,
    bettingStartedAt: new Date("2026-01-01T00:00:00.000Z"),
    runningStartedAt: new Date("2026-01-01T00:00:10.000Z"),
    crashedAt,
    settledAt: new Date(crashedAt.getTime() + 2_000),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date(crashedAt.getTime() + 2_000),
  });

describe("GetRoundsHistoryUseCase", () => {
  it("returns finished rounds ordered by latest crash first", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    await roundsRepository.save(makeSettledRound("round-old", new Date("2026-01-01T00:00:20.000Z")));
    await roundsRepository.save(makeSettledRound("round-new", new Date("2026-01-01T00:01:20.000Z")));
    const useCase = new GetRoundsHistoryUseCase(roundsRepository);

    const output = await useCase.execute({ page: 1, limit: 20 });

    expect(output.items.map((round) => round.roundId)).toEqual(["round-new", "round-old"]);
    expect(output.items[0]?.crashMultiplierBps).toBe(250);
    expect(output.items[0]?.serverSeedHash).toBe("round-new-server-seed-hash");
    expect(output.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
  });

  it("returns hasNextPage when there are more rounds than the requested limit", async () => {
    const roundsRepository = new FakeRoundsRepository(null);
    await roundsRepository.save(makeSettledRound("round-1", new Date("2026-01-01T00:00:20.000Z")));
    await roundsRepository.save(makeSettledRound("round-2", new Date("2026-01-01T00:01:20.000Z")));
    const useCase = new GetRoundsHistoryUseCase(roundsRepository);

    const output = await useCase.execute({ page: 1, limit: 1 });

    expect(output.items).toHaveLength(1);
    expect(output.pagination.hasNextPage).toBe(true);
  });
});
