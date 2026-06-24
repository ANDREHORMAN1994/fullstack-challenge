import { Clock } from "@/application/providers/clock";
import { IdGenerator } from "@/application/providers/id-generator";
import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { Wallet } from "@/domain/entities/wallet.entity";
import { Injectable } from "@nestjs/common";

export type CreateWalletInput = {
  playerId: string;
  currency?: string;
};

@Injectable()
export class CreateWalletUseCase {
  constructor(
    private repository: WalletsRepository,
    private newId: IdGenerator,
    private newDate: Clock,
  ) {}

  async execute(input: CreateWalletInput): Promise<Wallet> {
    const existingWallet = await this.repository.findByPlayerId(input.playerId);

    if (existingWallet) {
      throw new Error("Wallet already exists for this player");
    }

    const walletId = `wallet-${this.newId.generate()}`;
    const now = this.newDate.now();
    const demoInitialBalanceCents =
      process.env.WALLETS_DEMO_INITIAL_CREDIT_ENABLED === "true"
        ? BigInt(process.env.WALLETS_DEMO_INITIAL_BALANCE_CENTS ?? "0")
        : 0n;

    const newWallet = new Wallet({
      id: walletId,
      playerId: input.playerId,
      balanceCents: demoInitialBalanceCents,
      currency: input?.currency ?? "BRL",
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.save(newWallet);

    return newWallet;
  }
}
