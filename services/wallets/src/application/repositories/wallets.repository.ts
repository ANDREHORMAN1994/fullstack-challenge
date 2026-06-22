import { WalletTransaction } from "@/domain/entities/wallet-transaction.entity";
import { Wallet } from "@/domain/entities/wallet.entity";

export abstract class WalletsRepository {
  // Wallet methods
  abstract findByPlayerId(playerId: string): Promise<Wallet | null>;
  abstract findById(id: string): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<void>;

  // WalletTransaction methods
  abstract findWalletTransactionByOperationId(
    operationId: string,
  ): Promise<WalletTransaction | null>;
  abstract saveWalletTransaction(wallet: Wallet, transaction: WalletTransaction): Promise<void>;
}
