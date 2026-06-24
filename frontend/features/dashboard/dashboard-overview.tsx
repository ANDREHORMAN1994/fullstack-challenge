"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Gamepad2, Radio, User, Wallet } from "lucide-react";
import { getCrashPointClassName, getRoundStatusLabel } from "@/features/game/game-formatters";
import { useGameOverview } from "@/features/game/use-game-overview";
import { useRealtimeStatus } from "@/features/game/use-realtime-status";
import { useCurrentPlayer } from "@/features/player/use-current-player";
import { useWallet } from "@/features/wallet/use-wallet";
import { cn } from "@/lib/utils";
import { formatCents, formatMultiplier, shortId } from "@/lib/formatters/money";

export function DashboardOverview() {
  const player = useCurrentPlayer();
  const wallet = useWallet(player.accessToken);
  const game = useGameOverview();
  const realtime = useRealtimeStatus();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-50">Visao geral</h1>
        </div>
        <Link
          href="/game"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-black transition hover:bg-emerald-300"
        >
          <Gamepad2 size={18} />
          Ir para o jogo
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <OverviewCard title="Current player" icon={<User size={20} className="text-emerald-300" />}>
          <strong className="block truncate text-xl text-zinc-50">{player.username ?? "Jogador autenticado"}</strong>
          <span className="mt-1 block font-mono text-xs text-zinc-500">{shortId(player.playerId)}</span>
        </OverviewCard>

        <OverviewCard title="Wallet" icon={<Wallet size={20} className="text-cyan-300" />}>
          {wallet.isLoading ? (
            <CardSkeleton />
          ) : wallet.wallet ? (
            <>
              <strong className="block text-2xl text-zinc-50">{formatCents(wallet.wallet.balanceCents)}</strong>
              <span className="mt-1 block text-xs text-zinc-500">{wallet.wallet.currency}</span>
            </>
          ) : (
            <span className="text-sm text-zinc-500">{wallet.isMissing ? "Carteira ainda não criada" : "Saldo indisponível"}</span>
          )}
        </OverviewCard>

        <OverviewCard title="Current round" icon={<Clock3 size={20} className="text-amber-300" />}>
          {game.isCurrentRoundLoading ? <CardSkeleton /> : null}
          {game.isCurrentRoundError ? <span className="text-sm text-rose-300">Rodada indisponivel</span> : null}
          {!game.isCurrentRoundLoading && !game.isCurrentRoundError ? (
            <>
              <strong className="block text-xl text-zinc-50">{getRoundStatusLabel(game.currentRound?.status)}</strong>
              <span className="mt-1 block font-mono text-xs text-zinc-500">{shortId(game.currentRound?.roundId)}</span>
            </>
          ) : null}
        </OverviewCard>

        <OverviewCard title="Socket" icon={<Radio size={20} className={realtime.connected ? "text-emerald-300" : "text-rose-300"} />}>
          <strong className={cn("block text-xl", realtime.connected ? "text-emerald-300" : "text-rose-300")}>
            {realtime.connected ? "Online" : "Offline"}
          </strong>
          <span className="mt-1 block text-xs text-zinc-500">eventos em tempo real</span>
        </OverviewCard>

        <OverviewCard title="Last crash" icon={<ArrowRight size={20} className="text-rose-300" />}>
          {game.isHistoryLoading ? <CardSkeleton /> : null}
          {game.isHistoryError ? <span className="text-sm text-rose-300">Histórico indisponível</span> : null}
          {!game.isHistoryLoading && !game.isHistoryError ? (
            <>
              <strong className="block text-2xl text-zinc-50">{formatMultiplier(game.recentRounds[0]?.crashMultiplierBps)}</strong>
              <span className="mt-1 block text-xs text-zinc-500">histórico recente</span>
            </>
          ) : null}
        </OverviewCard>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Recent crash history</h2>
          <Link href="/history" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">
            Ver histórico
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.isHistoryLoading ? (
            <div className="h-10 w-72 animate-pulse rounded-md bg-zinc-900" />
          ) : null}
          {game.isHistoryError ? <p className="py-6 text-sm text-rose-300">Não foi possível carregar o histórico.</p> : null}
          {!game.isHistoryLoading && !game.isHistoryError
            ? game.recentRounds.slice(0, 12).map((round) => (
              <span
                key={round.roundId}
                className={cn("rounded-md px-3 py-2 text-sm font-bold", getCrashPointClassName(round.crashMultiplierBps))}
              >
                {formatMultiplier(round.crashMultiplierBps)}
              </span>
            ))
            : null}
          {!game.isHistoryLoading && !game.isHistoryError && game.recentRounds.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">Histórico vazio por enquanto.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-6 w-28 animate-pulse rounded bg-zinc-900" />
      <div className="h-3 w-20 animate-pulse rounded bg-zinc-900" />
    </div>
  );
}

function OverviewCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</p>
        {icon}
      </div>
      {children}
    </article>
  );
}
