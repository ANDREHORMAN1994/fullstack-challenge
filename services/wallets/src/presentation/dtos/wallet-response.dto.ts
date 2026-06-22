import { Wallet } from "@/domain/entities/wallet.entity";

export class WalletResponseDto {
  id: string;
  playerId: string;
  balanceCents: string;
  currency: string;
  createdAt: string;
  updatedAt: string;

  constructor(wallet: Wallet) {
    this.id = wallet.id;
    this.playerId = wallet.playerId;
    this.balanceCents = wallet.getBalanceCents().toString();
    this.currency = wallet.currency;
    this.createdAt = wallet.getCreatedAt().toISOString();
    this.updatedAt = wallet.getUpdatedAt().toISOString();
  }
}
