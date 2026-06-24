"use client";

import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getBetStatusClassName, getBetStatusLabel } from "@/features/game/game-formatters";
import { useMyBets } from "@/features/history/use-my-bets";
import { useCurrentPlayer } from "@/features/player/use-current-player";
import { cn } from "@/lib/utils";
import { formatCents, formatMultiplier, shortId } from "@/lib/formatters/money";

const PAGE_SIZE = 10;

export function MyBetsPlaceholder() {
  const player = useCurrentPlayer();
  const [page, setPage] = useState(1);
  const betsQuery = useMyBets(player.accessToken, page, PAGE_SIZE);
  const bets = betsQuery.data?.items ?? [];
  const pagination = betsQuery.data?.pagination;

  return (
    <section className="mx-auto max-w-6xl rounded-lg border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">My Bets</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-50">Minhas apostas</h1>
          <p className="mt-2 text-sm text-zinc-500">Histórico paginado retornado pelo Game Service.</p>
        </div>
        <BarChart3 size={28} className="text-emerald-300" />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="hidden grid-cols-[1.2fr_auto_auto_auto_auto_auto] gap-3 border-b border-zinc-800 bg-black/35 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 md:grid">
          <span>Round</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Multiplicador</span>
          <span>Pagamento</span>
          <span>Data</span>
        </div>

        {betsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-md bg-zinc-900" />
            ))}
          </div>
        ) : null}

        {betsQuery.isError ? (
          <div className="p-6 text-sm text-rose-300">
            Não foi possível carregar suas apostas. Tente recarregar a página.
          </div>
        ) : null}

        {!betsQuery.isLoading && !betsQuery.isError && bets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-zinc-300">Nenhuma aposta encontrada</p>
            <p className="mt-2 text-sm text-zinc-500">Aposte em uma rodada para ver seu histórico aqui.</p>
          </div>
        ) : null}

        <div className="divide-y divide-zinc-800">
          {bets.map((bet) => (
            <div
              key={bet.betId}
              className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1.2fr_auto_auto_auto_auto_auto] md:items-center"
            >
              <span className="font-mono text-xs text-zinc-500">{shortId(bet.roundId)}</span>
              <span className="text-zinc-100">{formatCents(bet.amountCents)}</span>
              <span className={cn("w-fit rounded-md px-2 py-1 text-xs font-semibold", getBetStatusClassName(bet.status))}>
                {getBetStatusLabel(bet.status)}
              </span>
              <span className="text-zinc-300">{bet.cashoutMultiplierBps ? formatMultiplier(bet.cashoutMultiplierBps) : "-"}</span>
              <span className="text-zinc-300">{bet.payoutCents ? formatCents(bet.payoutCents) : "-"}</span>
              <span className="text-xs text-zinc-500">{bet.createdAt ? new Date(bet.createdAt).toLocaleString("pt-BR") : "-"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-500">Página {pagination?.page ?? page}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1 || betsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            <ChevronLeft size={16} />
            Anterior
          </Button>
          <Button variant="secondary" disabled={!pagination?.hasNextPage || betsQuery.isFetching} onClick={() => setPage((current) => current + 1)}>
            Próxima
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
