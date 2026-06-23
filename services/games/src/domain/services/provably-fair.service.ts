import { createHash, createHmac, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

export type ProvablyFairInput = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
};

export type ProvablyFairVerificationInput = ProvablyFairInput & {
  serverSeedHash: string;
  crashMultiplierBps: number;
};

const SERVER_SEED_BYTES = 32;
const HMAC_HEX_CHARS_USED = 13;
const HOUSE_EDGE = 0.01;

@Injectable()
export class ProvablyFairService {
  generateServerSeed(): string {
    return randomBytes(SERVER_SEED_BYTES).toString("hex");
  }

  hashServerSeed(serverSeed: string): string {
    this.ensureNonEmpty("serverSeed", serverSeed);

    return createHash("sha256").update(serverSeed).digest("hex");
  }

  calculateCrashMultiplierBps(input: ProvablyFairInput): number {
    this.ensureNonEmpty("serverSeed", input.serverSeed);
    this.ensureNonEmpty("clientSeed", input.clientSeed);
    this.ensureValidNonce(input.nonce);

    const hmac = createHmac("sha256", input.serverSeed)
      .update(`${input.clientSeed}:${input.nonce}`)
      .digest("hex");
    const sample = Number.parseInt(hmac.slice(0, HMAC_HEX_CHARS_USED), 16);
    const maxSample = 16 ** HMAC_HEX_CHARS_USED;
    const roll = sample / maxSample;
    const multiplier = Math.max(1, (1 - HOUSE_EDGE) / Math.max(roll, Number.EPSILON));

    return Math.max(100, Math.floor(multiplier * 100));
  }

  verifyCrashPoint(input: ProvablyFairVerificationInput): boolean {
    if (this.hashServerSeed(input.serverSeed) !== input.serverSeedHash) {
      return false;
    }

    return this.calculateCrashMultiplierBps(input) === input.crashMultiplierBps;
  }

  private ensureNonEmpty(field: string, value: string): void {
    if (!value || value.trim() === "") {
      throw new Error(`${field} cannot be empty`);
    }
  }

  private ensureValidNonce(nonce: number): void {
    if (!Number.isInteger(nonce) || nonce < 0) {
      throw new Error("nonce must be a non-negative integer");
    }
  }
}
