"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, History, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getCrashPointClassName, getCrashPointTextClassName, getRoundStatusLabel } from "@/features/game/game-formatters";
import { useRoundHistory } from "@/features/game/use-round-history";
import { crashApi, type Round } from "@/lib/api";
import { verifyCrashRound } from "@/lib/provably-fair";
import { cn } from "@/lib/utils";
import { formatMultiplier, shortId } from "@/lib/formatters/money";

export function HistoryPlaceholder() {
  const historyQuery = useRoundHistory(1, 20);
  const rounds = historyQuery.data?.items ?? [];
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const selectedRound = rounds.find((round) => round.roundId === selectedRoundId) ?? rounds[0];

  useEffect(() => {
    if (!selectedRoundId && rounds[0]) {
      setSelectedRoundId(rounds[0].roundId);
    }
  }, [rounds, selectedRoundId]);

  return (
    <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_420px]">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">History</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-50">Histórico de rodadas</h1>
          <p className="mt-2 text-sm text-zinc-500">Selecione uma rodada para explicar hash, seed e verificação.</p>
        </div>
        <History size={28} className="text-emerald-300" />
      </div>

      {historyQuery.isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-md bg-zinc-900" />
          ))}
        </div>
      ) : null}

      {historyQuery.isError ? (
        <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          Não foi possível carregar o histórico de rodadas.
        </div>
      ) : null}

      {!historyQuery.isLoading && !historyQuery.isError && rounds.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-black/30 p-8 text-center">
          <p className="text-sm font-semibold text-zinc-300">Histórico vazio</p>
          <p className="mt-2 text-sm text-zinc-500">As rodadas aparecerão aqui depois que a engine crashar.</p>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rounds.map((round) => (
          <button
            key={round.roundId}
            className={cn(
              "rounded-md border bg-black/30 p-3 text-left transition hover:border-emerald-300/50",
              selectedRound?.roundId === round.roundId ? "border-emerald-300/50" : "border-zinc-800",
            )}
            onClick={() => setSelectedRoundId(round.roundId)}
          >
            <strong className={cn("text-lg", getCrashPointTextClassName(round.crashMultiplierBps))}>
              {formatMultiplier(round.crashMultiplierBps)}
            </strong>
            <p className="mt-1 font-mono text-xs text-zinc-500">{shortId(round.roundId)}</p>
            <span className={cn("mt-3 inline-flex rounded-md px-2 py-1 text-xs font-semibold", getCrashPointClassName(round.crashMultiplierBps))}>
              {getRoundStatusLabel(round.status)}
            </span>
          </button>
        ))}
      </div>
      </div>

      <ProvablyFairDetails round={selectedRound} />
    </section>
  );
}

function ProvablyFairDetails({ round }: { round?: Round }) {
  const verificationQuery = useQuery({
    queryKey: ["round-verification", round?.roundId],
    queryFn: () => crashApi.getRoundVerification(round!.roundId),
    enabled: Boolean(round?.roundId && ["CRASHED", "SETTLED"].includes(round.status)),
    retry: false,
  });
  const [localCheck, setLocalCheck] = useState<Awaited<ReturnType<typeof verifyCrashRound>> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!verificationQuery.data) {
        setLocalCheck(null);
        return;
      }

      const result = await verifyCrashRound(verificationQuery.data);
      if (!cancelled) setLocalCheck(result);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [verificationQuery.data]);

  const verified =
    Boolean(verificationQuery.data?.verified) &&
    Boolean(localCheck?.hashMatches) &&
    Boolean(localCheck?.multiplierMatches);

  return (
    <aside className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-5 lg:sticky lg:top-6 lg:self-start">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Provably Fair</p>
          <h2 className="mt-1 text-xl font-black text-zinc-50">Verificação</h2>
        </div>
        <ShieldCheck size={26} className="text-emerald-300" />
      </div>

      {!round ? <p className="text-sm text-zinc-500">Selecione uma rodada.</p> : null}
      {round ? (
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-zinc-500">Round ID</dt>
            <dd className="break-all font-mono text-xs text-zinc-300">{round.roundId}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Hash antes do resultado</dt>
            <dd className="break-all font-mono text-xs text-emerald-200">{round.serverSeedHash}</dd>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-md bg-black/30 p-3">
            <div>
              <dt className="text-zinc-500">Crash oficial</dt>
              <dd className="text-zinc-100">{formatMultiplier(round.crashMultiplierBps)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-zinc-100">{getRoundStatusLabel(round.status)}</dd>
            </div>
          </div>

          {!["CRASHED", "SETTLED"].includes(round.status) ? (
            <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">
              A seed do servidor ainda não deve ser exposta antes do crash.
            </div>
          ) : null}

          {verificationQuery.isLoading ? <div className="h-20 animate-pulse rounded-md bg-zinc-900" /> : null}
          {verificationQuery.isError ? (
            <div className="rounded-md border border-zinc-800 bg-black/30 p-3 text-zinc-400">
              Backend ainda não disponibilizou verificação para esta rodada.
            </div>
          ) : null}
          {verificationQuery.data ? (
            <>
              <div>
                <dt className="text-zinc-500">Server seed revelada</dt>
                <dd className="break-all font-mono text-xs text-zinc-300">{verificationQuery.data.serverSeed}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-md bg-black/30 p-3">
                <div>
                  <dt className="text-zinc-500">Recalculado</dt>
                  <dd className="text-zinc-100">{formatMultiplier(localCheck?.crashMultiplierBps)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Resultado</dt>
                  <dd className={verified ? "inline-flex items-center gap-1 text-emerald-300" : "inline-flex items-center gap-1 text-rose-300"}>
                    {verified ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {verified ? "Verificado" : "Divergente"}
                  </dd>
                </div>
              </div>
            </>
          ) : null}
        </dl>
      ) : null}
    </aside>
  );
}
