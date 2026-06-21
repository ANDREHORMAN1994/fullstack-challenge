export type WalletProps = {
  id: string;
  playerId: string;
  balanceCents: bigint;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

export class Wallet {
  readonly id: string;
  readonly playerId: string;
  private balanceCents: bigint;
  readonly currency: string;
  readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: WalletProps) {
    if (props.id.trim() === "") {
      throw new Error("ID cannot be empty");
    }

    if (props.playerId.trim() === "") {
      throw new Error("Player ID cannot be empty");
    }

    if (props.currency.trim() === "") {
      throw new Error("Currency cannot be empty");
    }

    if (props.balanceCents < 0n) {
      throw new Error("Balance cannot be negative");
    }

    this.id = props.id.trim();
    this.playerId = props.playerId.trim();
    this.balanceCents = props.balanceCents;
    this.currency = props.currency.trim().toUpperCase();
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  getBalanceCents(): bigint {
    return this.balanceCents;
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  debit(amountCents: bigint): void {
    if (amountCents <= 0n) {
      throw new Error("Amount must be greater than zero");
    }
    if (this.balanceCents - amountCents < 0n) {
      throw new Error("Insufficient balance");
    }
    this.balanceCents -= amountCents;
    this.updatedAt = new Date();
  }

  credit(amountCents: bigint): void {
    if (amountCents <= 0n) {
      throw new Error("Amount must be greater than zero");
    }
    this.balanceCents += amountCents;
    this.updatedAt = new Date();
  }
}
