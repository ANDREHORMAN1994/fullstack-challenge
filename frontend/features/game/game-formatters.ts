import type { BetStatus, RoundStatus } from "@/lib/api";

export function getRoundStatusLabel(status?: RoundStatus) {
  if (status === "BETTING") return "Apostas abertas";
  if (status === "RUNNING") return "Multiplicador em voo";
  if (status === "CRASHED") return "Crash revelado";
  if (status === "SETTLED") return "Rodada liquidada";
  return "Aguardando engine";
}

export function getBetStatusLabel(status?: BetStatus) {
  if (status === "CASHED_OUT") return "Cashout";
  if (status === "LOST") return "Perdida";
  if (status === "PLACED") return "Ativa";
  return status ?? "Ativa";
}

export function getBetStatusClassName(status?: BetStatus) {
  if (status === "CASHED_OUT") return "bg-emerald-400/15 text-emerald-300";
  if (status === "LOST") return "bg-rose-500/15 text-rose-300";
  return "bg-amber-300/15 text-amber-200";
}

export function getCrashPointClassName(multiplierBps?: number) {
  return (multiplierBps ?? 0) >= 200
    ? "bg-emerald-400/15 text-emerald-300"
    : "bg-rose-500/15 text-rose-300";
}

export function getCrashPointTextClassName(multiplierBps?: number) {
  return (multiplierBps ?? 0) >= 200 ? "text-emerald-300" : "text-rose-300";
}
