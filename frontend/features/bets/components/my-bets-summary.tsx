import { getBetStatusClassName, getBetStatusLabel } from "@/features/game/game-formatters";
import { Bet } from "@/lib/api";
import { cn, formatCents, shortId } from "@/lib/utils";

export function MyBets({ bets }: { bets: Bet[] }) {
  return (
    <section className="w-full h-full flex-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 overflow-auto">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Minhas últimas apostas
      </h2>
      <div className="space-y-2">
        {bets.map((bet) => (
          <div
            key={bet.betId}
            className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs text-zinc-500">{shortId(bet.roundId, 5)}</span>
            <span className="text-zinc-200">{formatCents(bet.amountCents)}</span>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                getBetStatusClassName(bet.status),
              )}
            >
              {getBetStatusLabel(bet.status)}
            </span>
          </div>
        ))}
        {bets.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">Sem apostas ainda</p>
        ) : null}
      </div>
    </section>
  );
}
