import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { afterEach, describe, expect, it } from "bun:test";
import { FakeClock, FakeIdGenerator, FakeWalletsRepository } from "../../utils/use-case-fakes";

const makeInstances = (ids: string[]) => {
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator(ids);
  const repository = new FakeWalletsRepository();
  const createWalletUseCase = new CreateWalletUseCase(repository, idGenerator, clock);

  return { clock, idGenerator, repository, createWalletUseCase };
};

describe("Check CreateWalletUseCase works", () => {
  const originalDemoCreditEnabled = process.env.WALLETS_DEMO_INITIAL_CREDIT_ENABLED;
  const originalDemoBalance = process.env.WALLETS_DEMO_INITIAL_BALANCE_CENTS;

  afterEach(() => {
    process.env.WALLETS_DEMO_INITIAL_CREDIT_ENABLED = originalDemoCreditEnabled;
    process.env.WALLETS_DEMO_INITIAL_BALANCE_CENTS = originalDemoBalance;
  });

  it("Check wallets fields are correct", async () => {
    const { repository, createWalletUseCase } = makeInstances(["123"]);

    await createWalletUseCase.execute({
      playerId: "player-123",
      currency: "BRL",
    });

    const demoInitialBalanceCents =
      process.env.WALLETS_DEMO_INITIAL_CREDIT_ENABLED === "true"
        ? BigInt(process.env.WALLETS_DEMO_INITIAL_BALANCE_CENTS ?? "0")
        : 0n;

    const wallet = await repository.findById("wallet-123");
    expect(wallet).not.toBeNull();
    expect(wallet).toHaveProperty("currency", "BRL");
    expect(wallet).toHaveProperty("playerId", "player-123");
    expect(wallet?.getBalanceCents()).toBe(demoInitialBalanceCents);
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

  it("creates a wallet with demo credit when evaluation seed is enabled", async () => {
    process.env.WALLETS_DEMO_INITIAL_CREDIT_ENABLED = "true";
    process.env.WALLETS_DEMO_INITIAL_BALANCE_CENTS = "100000";
    const { createWalletUseCase } = makeInstances(["123"]);

    const wallet = await createWalletUseCase.execute({
      playerId: "player-123",
    });

    expect(wallet.getBalanceCents()).toBe(100000n);
  });
});
