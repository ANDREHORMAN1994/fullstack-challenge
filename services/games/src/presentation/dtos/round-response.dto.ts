import type { RoundOutput } from "@/application/use-cases/create-round.use-case";

export class RoundResponseDto {
  roundId!: string;
  status!: string;
  crashMultiplierBps!: number;
  bettingStartedAt!: string;
  runningStartedAt?: string;
  crashedAt?: string;
  settledAt?: string;
  createdAt!: string;
  updatedAt!: string;

  constructor(round: RoundOutput) {
    this.roundId = round.roundId;
    this.status = round.status;
    this.crashMultiplierBps = round.crashMultiplierBps;
    this.bettingStartedAt = round.bettingStartedAt;
    this.runningStartedAt = round.runningStartedAt;
    this.crashedAt = round.crashedAt;
    this.settledAt = round.settledAt;
    this.createdAt = round.createdAt;
    this.updatedAt = round.updatedAt;
  }
}
