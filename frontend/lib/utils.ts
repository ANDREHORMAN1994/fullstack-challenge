import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(value: string | number | bigint | undefined) {
  const cents = BigInt(value ?? 0);
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const units = absolute / 100n;
  const decimals = absolute % 100n;

  return `${sign}R$ ${units.toLocaleString("pt-BR")},${decimals.toString().padStart(2, "0")}`;
}

export function formatMultiplier(multiplierBps?: number) {
  const maxMultiplierBps = Number(process.env.NEXT_PUBLIC_MAX_CRASH_MULTIPLIER_BPS ?? 500);
  const safeMultiplierBps = Math.min(multiplierBps ?? 100, maxMultiplierBps);

  return `${(safeMultiplierBps / 100).toFixed(2)}x`;
}

export function centsFromDecimalString(value: string) {
  const normalized = value.replace(",", ".").trim();
  const [units = "0", decimals = ""] = normalized.split(".");
  const safeDecimals = `${decimals}00`.slice(0, 2);

  return Number.parseInt(units, 10) * 100 + Number.parseInt(safeDecimals, 10);
}

export function shortId(value?: string, size = 8) {
  if (!value) return "-";
  return value.length <= size * 2 ? value : `${value.slice(0, size)}...${value.slice(-size)}`;
}
