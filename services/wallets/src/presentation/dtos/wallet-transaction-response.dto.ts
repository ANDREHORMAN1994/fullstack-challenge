import {
  WalletTransaction,
  type WalletTransactionType,
} from "@/domain/entities/wallet-transaction.entity";

export class WalletTransactionResponseDto {
  id: string;
  operationId: string;
  type: WalletTransactionType;
  amountCents: string;
  currency: string;
  balanceBeforeCents: string;
  balanceAfterCents: string;
  referenceRoundId?: string;
  referenceBetId?: string;
  createdAt: string;

  constructor(transaction: WalletTransaction) {
    this.id = transaction.id;
    this.operationId = transaction.operationId;
    this.type = transaction.type;
    this.amountCents = transaction.amountCents.toString();
    this.currency = transaction.currency;
    this.balanceBeforeCents = transaction.balanceBeforeCents.toString();
    this.balanceAfterCents = transaction.balanceAfterCents.toString();
    this.referenceRoundId = transaction.referenceRoundId;
    this.referenceBetId = transaction.referenceBetId;
    this.createdAt = transaction.getCreatedAt().toISOString();
  }
}
