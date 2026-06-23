import { describe, expect, it } from "bun:test";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";

describe("ProvablyFairService", () => {
  const service = new ProvablyFairService();

  it("generates a secure hexadecimal server seed", () => {
    const seed = service.generateServerSeed();

    expect(seed).toHaveLength(64);
    expect(seed).toMatch(/^[a-f0-9]+$/);
  });

  it("hashes the server seed with sha256", () => {
    expect(service.hashServerSeed("server-seed")).toBe(
      "91024ec49c5bec0b689e42892526320fce08337205c91de94c7a588c20d08eeb",
    );
  });

  it("calculates crash multiplier deterministically from seed, client seed, and nonce", () => {
    const input = {
      serverSeed: "server-seed",
      clientSeed: "round-1",
      nonce: 1,
    };

    expect(service.calculateCrashMultiplierBps(input)).toBe(
      service.calculateCrashMultiplierBps(input),
    );
  });

  it("changes the crash multiplier when the nonce changes", () => {
    const firstCrash = service.calculateCrashMultiplierBps({
      serverSeed: "server-seed",
      clientSeed: "round-1",
      nonce: 1,
    });
    const secondCrash = service.calculateCrashMultiplierBps({
      serverSeed: "server-seed",
      clientSeed: "round-1",
      nonce: 2,
    });

    expect(firstCrash).not.toBe(secondCrash);
  });

  it("verifies the server seed hash and crash point", () => {
    const serverSeed = "server-seed";
    const serverSeedHash = service.hashServerSeed(serverSeed);
    const crashMultiplierBps = service.calculateCrashMultiplierBps({
      serverSeed,
      clientSeed: "round-1",
      nonce: 1,
    });

    expect(
      service.verifyCrashPoint({
        serverSeed,
        serverSeedHash,
        clientSeed: "round-1",
        nonce: 1,
        crashMultiplierBps,
      }),
    ).toBe(true);
  });
});
