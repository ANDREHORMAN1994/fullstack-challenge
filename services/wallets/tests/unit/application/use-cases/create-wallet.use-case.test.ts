import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { describe, expect, it } from "bun:test";
import { FakeClock, FakeIdGenerator, FakeWalletsRepository } from "./utils.use-case";

const makeInstances = (ids: string[]) => {
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator(ids);
  const repository = new FakeWalletsRepository();
  const createWalletUseCase = new CreateWalletUseCase(repository, idGenerator, clock);

  return { clock, idGenerator, repository, createWalletUseCase };
};

describe("Check CreateWalletUseCase works", () => {
  it("Check wallets fields are correct", async () => {
    const { repository, createWalletUseCase } = makeInstances(["123"]);

    await createWalletUseCase.execute({
      playerId: "player-123",
      currency: "BRL",
    });

    const wallet = await repository.findById("wallet-123");
    expect(wallet).not.toBeNull();
    expect(wallet).toHaveProperty("currency", "BRL");
    expect(wallet).toHaveProperty("playerId", "player-123");
    expect(wallet?.getBalanceCents()).toBe(0n);
  });

  it("check if repository has 1 wallet saved", async () => {
    const { repository, createWalletUseCase } = makeInstances(["123"]);

    await createWalletUseCase.execute({
      playerId: "player-123",
      currency: "BRL",
    });

    const wallet = await repository.findById("wallet-123");
    expect(wallet).not.toBeNull();

    const allWallets = repository.getWallets();
    expect(allWallets.length).toBe(1);
  });

  it("should create a new wallet", async () => {
    const { repository, createWalletUseCase } = makeInstances(["123", "456"]);

    await createWalletUseCase.execute({
      playerId: "player-123",
      currency: "BRL",
    });

    await createWalletUseCase.execute({
      playerId: "player-456",
      currency: "BRL",
    });

    const wallets = repository.getWallets();
    expect(wallets.length).toBe(2);
  });

  it("rejects creating a wallet when player already has one", async () => {
    const { repository, createWalletUseCase } = makeInstances(["123", "456"]);

    await createWalletUseCase.execute({
      playerId: "player-123",
      currency: "BRL",
    });

    await expect(
      createWalletUseCase.execute({
        playerId: "player-123",
        currency: "BRL",
      }),
    ).rejects.toThrow("Wallet already exists for this player");

    expect(repository.getWallets()).toHaveLength(1);
  });

  it("creates a wallet with BRL as default currency", async () => {
    const { createWalletUseCase } = makeInstances(["123"]);

    const wallet = await createWalletUseCase.execute({
      playerId: "player-123",
    });

    expect(wallet.currency).toBe("BRL");
  });
});
