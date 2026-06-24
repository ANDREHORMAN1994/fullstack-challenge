const HOUSE_EDGE_BPS = 100;
const MAX_HASH_SAMPLE = 2 ** 52;

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return bytesToHex(hash);
}

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));

  return bytesToHex(signature);
}

export async function verifyCrashRound(input: {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashMultiplierBps: number;
}) {
  const serverSeedHash = await sha256Hex(input.serverSeed);
  const hmac = await hmacSha256Hex(input.serverSeed, `${input.clientSeed}:${input.nonce}`);
  const sample = Number.parseInt(hmac.slice(0, 13), 16);
  const fairMultiplier = Math.floor(((10000 - HOUSE_EDGE_BPS) * MAX_HASH_SAMPLE) / (MAX_HASH_SAMPLE - sample));
  const crashMultiplierBps = Math.max(10000, fairMultiplier);

  return {
    serverSeedHash,
    crashMultiplierBps,
    hashMatches: serverSeedHash === input.serverSeedHash,
    multiplierMatches: crashMultiplierBps === input.crashMultiplierBps,
  };
}
