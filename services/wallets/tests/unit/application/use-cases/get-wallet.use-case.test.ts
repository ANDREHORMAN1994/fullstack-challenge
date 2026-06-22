import { describe, expect, it } from "bun:test";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { Wallet } from "@/domain/entities/wallet.entity";
import { FakeWalletsRepository } from "../../utils/use-case-fakes";

describe("Check GetWalletUseCase works", () => {
  it("throws error when wallet doesn't exist", async () => {
    const repository = new FakeWalletsRepository();
    const getWalletUseCase = new GetWalletUseCase(repository);

    await expect(
      getWalletUseCase.execute({
        playerId: "player-123",
      }),
    ).rejects.toThrow("Wallet not found");
  });

  it("returns wallet by playerId", async () => {
    const repository = new FakeWalletsRepository();
    const getWalletUseCase = new GetWalletUseCase(repository);

    const wallet = new Wallet({
      id: "wallet-123",
      playerId: "player-123",
      balanceCents: 0n,
      currency: "BRL",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    await repository.save(wallet);

    const result = await getWalletUseCase.execute({
      playerId: "player-123",
    });

    expect(result.id).toBe("wallet-123");
    expect(result.playerId).toBe("player-123");
    expect(result.currency).toBe("BRL");
  });
});
