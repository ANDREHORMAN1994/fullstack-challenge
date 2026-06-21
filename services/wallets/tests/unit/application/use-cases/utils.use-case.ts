import { Clock } from "@/application/providers/clock";
import { IdGenerator } from "@/application/providers/id-generator";
import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { Wallet } from "@/domain/entities/wallet.entity";

export class FakeClock extends Clock {
  now(): Date {
    return new Date("2026-01-01");
  }
}

export class FakeIdGenerator extends IdGenerator {
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

export class FakeWalletsRepository extends WalletsRepository {
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
