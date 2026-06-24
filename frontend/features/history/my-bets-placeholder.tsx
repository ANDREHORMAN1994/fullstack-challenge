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
const tableGridClass =
  "md:grid-cols-[minmax(180px,1.5fr)_minmax(96px,0.7fr)_minmax(96px,0.7fr)_minmax(124px,0.8fr)_minmax(112px,0.8fr)_minmax(156px,1fr)]";

export function MyBetsPlaceholder() {
  const player = useCurrentPlayer();
  const [page, setPage] = useState(1);
  const betsQuery = useMyBets(player.accessToken, page, PAGE_SIZE);
  const bets = betsQuery.data?.items ?? [];
  const pagination = betsQuery.data?.pagination;

  return (
    <section className="flex-1 w-full max-w-6xl rounded-lg border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">My Bets</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-50">Minhas apostas</h1>
          <p className="mt-2 text-sm text-zinc-500">Histórico paginado retornado pelo Game Service.</p>
        </div>
        <BarChart3 size={28} className="text-emerald-300" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <div className={cn("hidden min-w-220 gap-4 border-b border-zinc-800 bg-black/35 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 md:grid", tableGridClass)}>
          <span>Round</span>
          <span className="text-right">Valor</span>
          <span>Status</span>
          <span>Multiplicador</span>
          <span className="text-right">Pagamento</span>
          <span className="text-right">Data</span>
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
              className={cn("grid min-w-220 gap-4 px-4 py-4 text-sm md:grid md:items-center", tableGridClass)}
            >
              <span className="min-w-0 truncate font-mono text-xs text-zinc-500" title={bet.roundId}>
                {shortId(bet.roundId)}
              </span>
              <span className="text-right text-zinc-100">{formatCents(bet.amountCents)}</span>
              <span className={cn("w-fit rounded-md px-2 py-1 text-xs font-semibold", getBetStatusClassName(bet.status))}>
                {getBetStatusLabel(bet.status)}
              </span>
              <span className="text-zinc-300">{bet.cashoutMultiplierBps ? formatMultiplier(bet.cashoutMultiplierBps) : "-"}</span>
              <span className="text-right text-zinc-300">{bet.payoutCents ? formatCents(bet.payoutCents) : "-"}</span>
              <span className="whitespace-nowrap text-right text-xs text-zinc-500">{bet.createdAt ? new Date(bet.createdAt).toLocaleString("pt-BR") : "-"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-full flex items-center justify-between gap-3">
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
