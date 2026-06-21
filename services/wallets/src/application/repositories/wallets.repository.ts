import { Wallet } from "@/domain/entities/wallet.entity";

export abstract class WalletsRepository {
  abstract findByPlayerId(playerId: string): Promise<Wallet | null>;
  abstract findById(id: string): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<void>;
}
