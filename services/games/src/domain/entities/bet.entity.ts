export type BetStatus = "PLACED" | "CASHED_OUT" | "LOST";

export type BetProps = {
  id: string;
  playerId: string;
  roundId: string;
  amountCents: bigint;
  status?: BetStatus;
  cashoutMultiplierBps?: number;
  payoutCents?: bigint;
  createdAt: Date;
  updatedAt: Date;
};

export const MIN_BET_AMOUNT_CENTS = 100n;
export const MAX_BET_AMOUNT_CENTS = 100000n;
export const MIN_CASHOUT_MULTIPLIER_BPS = 100;

export class Bet {
  readonly id: string;
  readonly playerId: string;
  readonly roundId: string;
  readonly amountCents: bigint;
  private status: BetStatus;
  private cashoutMultiplierBps?: number;
  private payoutCents?: bigint;
  private createdAt: Date;
  private updatedAt: Date;

  constructor(props: BetProps) {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Bet ID cannot be empty");
    }

    if (!props.playerId || props.playerId.trim() === "") {
      throw new Error("Player ID cannot be empty");
    }

    if (!props.roundId || props.roundId.trim() === "") {
      throw new Error("Round ID cannot be empty");
    }

    if (props.amountCents < MIN_BET_AMOUNT_CENTS) {
      throw new Error("Bet amount is below minimum");
    }

    if (props.amountCents > MAX_BET_AMOUNT_CENTS) {
      throw new Error("Bet amount is above maximum");
    }

    const status = props.status ?? "PLACED";

    if (!["PLACED", "CASHED_OUT", "LOST"].includes(status)) {
      throw new Error("Invalid bet status");
    }

    if (status === "CASHED_OUT") {
      this.ensureCashoutState(props.cashoutMultiplierBps, props.payoutCents);
    }

    if (status !== "CASHED_OUT" && (props.cashoutMultiplierBps || props.payoutCents)) {
      throw new Error("Only cashed out bets can have cashout data");
    }

    this.id = props.id.trim();
    this.playerId = props.playerId.trim();
    this.roundId = props.roundId.trim();
    this.amountCents = props.amountCents;
    this.status = status;
    this.cashoutMultiplierBps = props.cashoutMultiplierBps;
    this.payoutCents = props.payoutCents;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  getStatus(): BetStatus {
    return this.status;
  }

  getCashoutMultiplierBps(): number | undefined {
    return this.cashoutMultiplierBps;
  }

  getPayoutCents(): bigint | undefined {
    return this.payoutCents;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  cashout(multiplierBps: number, now = new Date()): bigint {
    if (this.status !== "PLACED") {
      throw new Error("Only placed bets can be cashed out");
    }

    if (!Number.isInteger(multiplierBps) || multiplierBps < MIN_CASHOUT_MULTIPLIER_BPS) {
      throw new Error("Cashout multiplier must be at least 1.00x");
    }

    const payoutCents = (this.amountCents * BigInt(multiplierBps)) / 100n;

    this.status = "CASHED_OUT";
    this.cashoutMultiplierBps = multiplierBps;
    this.payoutCents = payoutCents;
    this.updatedAt = new Date(now);

    return payoutCents;
  }

  markAsLost(now = new Date()): void {
    if (this.status !== "PLACED") {
      throw new Error("Only placed bets can be marked as lost");
    }

    this.status = "LOST";
    this.updatedAt = new Date(now);
  }

  private ensureCashoutState(multiplierBps?: number, payoutCents?: bigint): void {
    if (!multiplierBps || !Number.isInteger(multiplierBps)) {
      throw new Error("Cashed out bets must have a valid multiplier");
    }

    if (multiplierBps < MIN_CASHOUT_MULTIPLIER_BPS) {
      throw new Error("Cashout multiplier must be at least 1.00x");
    }

    if (!payoutCents || payoutCents <= 0n) {
      throw new Error("Cashed out bets must have a positive payout");
    }
  }
}
