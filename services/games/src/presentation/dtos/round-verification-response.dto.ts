import type { RoundVerificationOutput } from "@/application/use-cases/get-round-verification.use-case";

export class RoundVerificationResponseDto {
  roundId!: string;
  status!: string;
  serverSeed!: string;
  serverSeedHash!: string;
  clientSeed!: string;
  nonce!: number;
  crashMultiplierBps!: number;
  verified!: boolean;

  constructor(verification: RoundVerificationOutput) {
    this.roundId = verification.roundId;
    this.status = verification.status;
    this.serverSeed = verification.serverSeed;
    this.serverSeedHash = verification.serverSeedHash;
    this.clientSeed = verification.clientSeed;
    this.nonce = verification.nonce;
    this.crashMultiplierBps = verification.crashMultiplierBps;
    this.verified = verification.verified;
  }
}
