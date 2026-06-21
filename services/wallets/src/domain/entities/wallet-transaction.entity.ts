export type WalletTransactionType = "BET_DEBIT" | "CASHOUT_CREDIT";

export type WalletTransactionProps = {
  id: string;
  operationId: string;
  type: WalletTransactionType;
  amountCents: bigint;
  currency: string;
  balanceBeforeCents: bigint;
  balanceAfterCents: bigint;
  referenceRoundId?: string;
  referenceBetId?: string;
  createdAt: Date;
};

export class WalletTransaction {
  readonly id: string;
  readonly operationId: string;
  readonly type: WalletTransactionType;
  readonly amountCents: bigint;
  readonly currency: string;
  readonly balanceBeforeCents: bigint;
  readonly balanceAfterCents: bigint;
  readonly referenceRoundId?: string;
  readonly referenceBetId?: string;
  private createdAt: Date;

  constructor(props: WalletTransactionProps) {
    if (!props.id || props.id.trim() === "") {
      throw new Error("ID cannot be empty");
    }

    if (!props.operationId || props.operationId.trim() === "") {
      throw new Error("Operation ID cannot be empty");
    }

    if (!props.currency || props.currency.trim() === "") {
      throw new Error("Currency cannot be empty");
    }

    if (!(["BET_DEBIT", "CASHOUT_CREDIT"] as WalletTransactionType[]).includes(props.type)) {
      throw new Error("Invalid transaction type");
    }

    if (props.amountCents <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    if (props.balanceBeforeCents < 0n || props.balanceAfterCents < 0n) {
      throw new Error("Balance cannot be negative");
    }

    this.validateBalanceAfter(
      props.type,
      props.amountCents,
      props.balanceBeforeCents,
      props.balanceAfterCents,
    );

    this.id = props.id.trim();
    this.operationId = props.operationId.trim();
    this.type = props.type;
    this.amountCents = props.amountCents;
    this.currency = props.currency.trim().toUpperCase();
    this.balanceBeforeCents = props.balanceBeforeCents;
    this.balanceAfterCents = props.balanceAfterCents;
    this.referenceRoundId = props.referenceRoundId;
    this.referenceBetId = props.referenceBetId;
    this.createdAt = new Date(props.createdAt);
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  private validateBalanceAfter(
    type: WalletTransactionType,
    amountCents: bigint,
    balanceBeforeCents: bigint,
    balanceAfterCents: bigint,
  ): void {
    if (type === "BET_DEBIT") {
      const currentDebit = amountCents;
      const expectedBalanceAfter = balanceBeforeCents - currentDebit;
      if (balanceAfterCents !== expectedBalanceAfter) {
        throw new Error("Invalid balance after debit");
      }
    }

    if (type === "CASHOUT_CREDIT") {
      const currentCredit = amountCents;
      const expectedBalanceAfter = balanceBeforeCents + currentCredit;
      if (balanceAfterCents !== expectedBalanceAfter) {
        throw new Error("Invalid balance after credit");
      }
    }
  }
}
