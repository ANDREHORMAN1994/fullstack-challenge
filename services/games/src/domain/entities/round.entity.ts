export type RoundStatus = "BETTING" | "RUNNING" | "CRASHED" | "SETTLED";

export type RoundProps = {
  id: string;
  status?: RoundStatus;
  crashMultiplierBps: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  bettingStartedAt: Date;
  runningStartedAt?: Date;
  crashedAt?: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const MIN_CRASH_MULTIPLIER_BPS = 100;

export class Round {
  readonly id: string;
  readonly crashMultiplierBps: number;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  readonly clientSeed: string;
  readonly nonce: number;
  private status: RoundStatus;
  private bettingStartedAt: Date;
  private runningStartedAt?: Date;
  private crashedAt?: Date;
  private settledAt?: Date;
  private createdAt: Date;
  private updatedAt: Date;

  constructor(props: RoundProps) {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Round ID cannot be empty");
    }

    if (
      !Number.isInteger(props.crashMultiplierBps) ||
      props.crashMultiplierBps < MIN_CRASH_MULTIPLIER_BPS
    ) {
      throw new Error("Crash multiplier must be at least 1.00x");
    }

    if (!props.serverSeed || props.serverSeed.trim() === "") {
      throw new Error("Server seed cannot be empty");
    }

    if (!props.serverSeedHash || props.serverSeedHash.trim() === "") {
      throw new Error("Server seed hash cannot be empty");
    }

    if (!props.clientSeed || props.clientSeed.trim() === "") {
      throw new Error("Client seed cannot be empty");
    }

    if (!Number.isInteger(props.nonce) || props.nonce < 0) {
      throw new Error("Nonce must be a non-negative integer");
    }

    const status = props.status ?? "BETTING";

    if (!["BETTING", "RUNNING", "CRASHED", "SETTLED"].includes(status)) {
      throw new Error("Invalid round status");
    }

    this.ensureTimestampsMatchStatus(status, props);

    this.id = props.id.trim();
    this.crashMultiplierBps = props.crashMultiplierBps;
    this.serverSeed = props.serverSeed.trim();
    this.serverSeedHash = props.serverSeedHash.trim();
    this.clientSeed = props.clientSeed.trim();
    this.nonce = props.nonce;
    this.status = status;
    this.bettingStartedAt = new Date(props.bettingStartedAt);
    this.runningStartedAt = props.runningStartedAt
      ? new Date(props.runningStartedAt)
      : undefined;
    this.crashedAt = props.crashedAt ? new Date(props.crashedAt) : undefined;
    this.settledAt = props.settledAt ? new Date(props.settledAt) : undefined;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
  }

  getStatus(): RoundStatus {
    return this.status;
  }

  getBettingStartedAt(): Date {
    return new Date(this.bettingStartedAt);
  }

  getRunningStartedAt(): Date | undefined {
    return this.runningStartedAt ? new Date(this.runningStartedAt) : undefined;
  }

  getCrashedAt(): Date | undefined {
    return this.crashedAt ? new Date(this.crashedAt) : undefined;
  }

  getSettledAt(): Date | undefined {
    return this.settledAt ? new Date(this.settledAt) : undefined;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  canAcceptBets(): boolean {
    return this.status === "BETTING";
  }

  canCashout(): boolean {
    return this.status === "RUNNING";
  }

  startRunning(now = new Date()): void {
    if (this.status !== "BETTING") {
      throw new Error("Only betting rounds can start running");
    }

    this.status = "RUNNING";
    this.runningStartedAt = new Date(now);
    this.updatedAt = new Date(now);
  }

  crash(now = new Date()): void {
    if (this.status !== "RUNNING") {
      throw new Error("Only running rounds can crash");
    }

    this.status = "CRASHED";
    this.crashedAt = new Date(now);
    this.updatedAt = new Date(now);
  }

  settle(now = new Date()): void {
    if (this.status !== "CRASHED") {
      throw new Error("Only crashed rounds can be settled");
    }

    this.status = "SETTLED";
    this.settledAt = new Date(now);
    this.updatedAt = new Date(now);
  }

  ensureAcceptsBets(): void {
    if (!this.canAcceptBets()) {
      throw new Error("Round is not accepting bets");
    }
  }

  ensureAcceptsCashout(): void {
    if (!this.canCashout()) {
      throw new Error("Round is not accepting cashouts");
    }
  }

  private ensureTimestampsMatchStatus(status: RoundStatus, props: RoundProps): void {
    if (status === "BETTING") {
      if (props.runningStartedAt || props.crashedAt || props.settledAt) {
        throw new Error("Betting rounds cannot have running, crash, or settlement timestamps");
      }
    }

    if (status === "RUNNING" && !props.runningStartedAt) {
      throw new Error("Running rounds must have a running start timestamp");
    }

    if (status === "RUNNING" && (props.crashedAt || props.settledAt)) {
      throw new Error("Running rounds cannot have crash or settlement timestamps");
    }

    if (status === "CRASHED" && (!props.runningStartedAt || !props.crashedAt)) {
      throw new Error("Crashed rounds must have running and crash timestamps");
    }

    if (status === "CRASHED" && props.settledAt) {
      throw new Error("Crashed rounds cannot have a settlement timestamp");
    }

    if (
      status === "SETTLED" &&
      (!props.runningStartedAt || !props.crashedAt || !props.settledAt)
    ) {
      throw new Error("Settled rounds must have running, crash, and settlement timestamps");
    }
  }
}
