import { Wallet } from "@/domain/entities/wallet.entity";
import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { Injectable } from "@nestjs/common";

export type GetWalletInput = {
  playerId: string;
};

@Injectable()
export class GetWalletUseCase {
  constructor(private repository: WalletsRepository) {}

  async execute(input: GetWalletInput): Promise<Wallet> {
    const wallet = await this.repository.findByPlayerId(input.playerId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return wallet;
  }
}
