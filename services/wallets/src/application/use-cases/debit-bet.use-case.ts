import { WalletsRepository } from "@/application/repositories/wallets.repository";
import { WalletTransaction } from "@/domain/entities/wallet-transaction.entity";
import { Clock } from "@/application/providers/clock";
import { IdGenerator } from "@/application/providers/id-generator";

export type DebitBetInput = {
  playerId: string;
  operationId: string;
  amountCents: bigint;
  referenceRoundId: string;
  referenceBetId: string;
};

export class DebitBetUseCase {
  constructor(
    private repository: WalletsRepository,
    private newId: IdGenerator,
    private newDate: Clock,
  ) {}

  async execute(input: DebitBetInput): Promise<WalletTransaction> {
    const findTransaction = await this.repository.findWalletTransactionByOperationId(
      input.operationId,
    );

    if (findTransaction) {
      return findTransaction;
    }

    const wallet = await this.repository.findByPlayerId(input.playerId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const balanceBeforeCents = wallet.getBalanceCents();

    wallet.debit(input.amountCents);

    const balanceAfterCents = wallet.getBalanceCents();
    const transactionId = `transaction-${this.newId.generate()}`;
    const now = this.newDate.now();

    const newTransaction = new WalletTransaction({
      id: transactionId,
      operationId: input.operationId,
      type: "BET_DEBIT",
      amountCents: input.amountCents,
      currency: wallet.currency,
      balanceBeforeCents,
      balanceAfterCents,
      referenceRoundId: input.referenceRoundId,
      referenceBetId: input.referenceBetId,
      createdAt: now,
    });

    await this.repository.saveWalletTransaction(wallet, newTransaction);
    return newTransaction;
  }
}
