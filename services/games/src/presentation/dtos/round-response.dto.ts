import type { RoundOutput } from "@/application/use-cases/create-round.use-case";

export class RoundResponseDto {
  roundId!: string;
  status!: string;
  crashMultiplierBps?: number;
  serverSeedHash!: string;
  clientSeed!: string;
  nonce!: number;
  serverSeed?: string;
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
    this.serverSeedHash = round.serverSeedHash;
    this.clientSeed = round.clientSeed;
    this.nonce = round.nonce;
    this.serverSeed = round.serverSeed;
    this.bettingStartedAt = round.bettingStartedAt;
    this.runningStartedAt = round.runningStartedAt;
    this.crashedAt = round.crashedAt;
    this.settledAt = round.settledAt;
    this.createdAt = round.createdAt;
    this.updatedAt = round.updatedAt;
  }
}
