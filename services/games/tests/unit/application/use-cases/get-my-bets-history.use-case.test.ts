import { describe, expect, it } from "bun:test";
import { GetMyBetsHistoryUseCase } from "@/application/use-cases/get-my-bets-history.use-case";
import { Bet } from "@/domain/entities/bet.entity";
import { FakeBetRepository } from "../../utils/wallet-client-fake";

const makeBet = (id: string, playerId: string, createdAt: Date): Bet =>
  new Bet({
    id,
    playerId,
    roundId: `round-${id}`,
    amountCents: 250n,
    createdAt,
    updatedAt: createdAt,
  });

describe("GetMyBetsHistoryUseCase", () => {
  it("returns player bets ordered by latest first", async () => {
    const betsRepository = new FakeBetRepository();
    await betsRepository.create(makeBet("old", "player-1", new Date("2026-01-01T00:00:00.000Z")));
    await betsRepository.create(makeBet("new", "player-1", new Date("2026-01-01T00:01:00.000Z")));
    await betsRepository.create(makeBet("other", "player-2", new Date("2026-01-01T00:02:00.000Z")));
    const useCase = new GetMyBetsHistoryUseCase(betsRepository);

    const output = await useCase.execute({ playerId: "player-1", page: 1, limit: 20 });

    expect(output.items.map((bet) => bet.betId)).toEqual(["new", "old"]);
    expect(output.items[0]?.amountCents).toBe("250");
    expect(output.pagination).toEqual({ page: 1, limit: 20, hasNextPage: false });
  });

  it("rejects empty player identifiers", async () => {
    const useCase = new GetMyBetsHistoryUseCase(new FakeBetRepository());

    await expect(useCase.execute({ playerId: " ", page: 1, limit: 20 })).rejects.toThrow(
      "Player ID cannot be empty",
    );
  });
});
