import { Clock } from "@/application/providers/clock";
import { IdGenerator } from "@/application/providers/id-generator";
import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { Wallet } from "@/domain/entities/wallet.entity";
import { describe, expect, it } from "bun:test";

class FakeClock extends Clock {
  now(): Date {
    return new Date("2026-01-01");
  }
}

class FakeIdGenerator extends IdGenerator {
  constructor(private ids: string[]) {
    super();
  }

  generate(): string {
    const currentId = this.ids.shift();

    if (!currentId) {
      throw new Error("No fake ids left");
    }

    return currentId;
  }
}

class FakeWalletsRepository extends WalletsRepository {
  private wallets: Wallet[] = [];

  async findById(id: string): Promise<Wallet | null> {
    const wallet = this.wallets.find((w) => w.id === id);
    if (!wallet) {
      return null;
    }
    return wallet;
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const wallet = this.wallets.find((w) => w.playerId === playerId);
    if (!wallet) {
      return null;
    }
    return wallet;
  }

  async save(wallet: Wallet): Promise<void> {
    const existingIndex = this.wallets.findIndex((w) => w.id === wallet.id);
    if (existingIndex !== -1) {
      this.wallets[existingIndex] = wallet;
    } else {
      this.wallets.push(wallet);
    }
  }

  getWallets(): Wallet[] {
    return this.wallets;
  }
}

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
