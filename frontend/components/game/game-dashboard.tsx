"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, Shield, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BetControls } from "@/components/game/bet-controls";
import { CrashChart } from "@/components/game/crash-chart";
import { Button } from "@/components/ui/button";
import { Bet, crashApi, Round } from "@/lib/api";
import { createGameSocket, realtimeEvents } from "@/lib/realtime";
import { formatCents, formatMultiplier, shortId } from "@/lib/utils";

type LiveBet = Bet & {
  status: "PLACED" | "CASHED_OUT" | "LOST";
};

export function GameDashboard() {
  const { data: session, status: authStatus } = useSession();
  const queryClient = useQueryClient();
  const token = session?.accessToken;
  const username = session?.user.username ?? session?.user.name ?? "visitante";
  const [round, setRound] = useState<Round | null>(null);
  const [multiplierBps, setMultiplierBps] = useState(10000);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [connected, setConnected] = useState(false);

  const currentRoundQuery = useQuery({
    queryKey: ["current-round"],
    queryFn: crashApi.getCurrentRound,
    retry: false,
  });

  const walletQuery = useQuery({
    queryKey: ["wallet", token],
    queryFn: () => crashApi.getWallet(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["round-history"],
    queryFn: crashApi.getRoundHistory,
  });

  const myBetsQuery = useQuery({
    queryKey: ["my-bets", token],
    queryFn: () => crashApi.getMyBets(token!),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (currentRoundQuery.data) {
      setRound(currentRoundQuery.data);
      setMultiplierBps(currentRoundQuery.data.crashMultiplierBps ?? 10000);
    }
  }, [currentRoundQuery.data]);

  useEffect(() => {
    const socket = createGameSocket();

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, (payload) => {
        if (eventName === "round.created") {
          const nextRound = payload as Partial<Round> & { roundId: string };
          setRound((previous) => ({
            roundId: nextRound.roundId,
            status: "BETTING",
            serverSeedHash: String(nextRound.serverSeedHash),
            clientSeed: String(nextRound.clientSeed),
            nonce: Number(nextRound.nonce),
            bettingStartedAt: String(nextRound.bettingStartedAt),
            createdAt: previous?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          setMultiplierBps(10000);
          setLiveBets([]);
        }

        if (eventName === "round.started") {
          setRound((previous) => (previous ? { ...previous, status: "RUNNING", runningStartedAt: String(payload.runningStartedAt) } : previous));
          setMultiplierBps(10000);
        }

        if (eventName === "round.multiplier") {
          setMultiplierBps(Number(payload.multiplierBps));
        }

        if (eventName === "round.crashed") {
          setRound((previous) =>
            previous
              ? {
                  ...previous,
                  status: "CRASHED",
                  crashMultiplierBps: Number(payload.crashMultiplierBps),
                  crashedAt: String(payload.crashedAt),
                }
              : previous,
          );
          setMultiplierBps(Number(payload.crashMultiplierBps));
          setLiveBets((bets) => bets.map((bet) => (bet.status === "PLACED" ? { ...bet, status: "LOST" } : bet)));
          void queryClient.invalidateQueries({ queryKey: ["round-history"] });
          void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
        }

        if (eventName === "bet.placed") {
          const bet = payload as LiveBet;
          setLiveBets((bets) => [{ ...bet, status: "PLACED" }, ...bets.filter((item) => item.betId !== bet.betId)]);
        }

        if (eventName === "bet.cashed_out") {
          const cashedOut = payload as LiveBet;
          setLiveBets((bets) =>
            bets.map((bet) =>
              bet.betId === cashedOut.betId
                ? {
                    ...bet,
                    status: "CASHED_OUT",
                    cashoutMultiplierBps: cashedOut.cashoutMultiplierBps,
                    payoutCents: cashedOut.payoutCents,
                  }
                : bet,
            ),
          );
          void queryClient.invalidateQueries({ queryKey: ["wallet"] });
          void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
        }
      });
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const placeBet = useMutation({
    mutationFn: (amountCents: number) => crashApi.placeBet(token!, amountCents),
    onSuccess: (response) => {
      toast.success("Aposta aceita", { description: formatCents(response.amountCents) });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
    },
    onError: (error) => toast.error("Aposta recusada", { description: error.message }),
  });

  const cashout = useMutation({
    mutationFn: () => crashApi.cashout(token!),
    onSuccess: (response) => {
      toast.success("Cashout confirmado", { description: formatCents(response.payoutCents) });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
    },
    onError: (error) => toast.error("Cashout falhou", { description: error.message }),
  });

  const createWallet = useMutation({
    mutationFn: () => crashApi.createWallet(token!),
    onSuccess: () => {
      toast.success("Carteira criada");
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => toast.error("Nao foi possivel criar carteira", { description: error.message }),
  });

  const myPendingBet = useMemo(() => {
    const playerId = session?.user.id;
    return liveBets.find((bet) => bet.playerId === playerId && bet.status === "PLACED");
  }, [liveBets, session?.user.id]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <header className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Crash Game</p>
            <h1 className="mt-1 text-2xl font-black text-zinc-50">Rodada em tempo real</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
              <Shield size={16} className={connected ? "text-emerald-300" : "text-rose-300"} />
              {connected ? "Socket online" : "Socket offline"}
            </span>
            {authStatus === "authenticated" ? (
              <Button variant="secondary" onClick={() => signOut()}>
                <LogOut size={16} />
                Sair
              </Button>
            ) : (
              <Button onClick={() => signIn("keycloak")}>
                <LogIn size={16} />
                Entrar
              </Button>
            )}
          </div>
        </header>

        <CrashChart
          multiplierBps={multiplierBps}
          status={round?.status ?? "BETTING"}
          crashedAtBps={round?.crashMultiplierBps}
        />

        <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <LiveBets bets={liveBets} />
          <RoundHistory rounds={historyQuery.data?.items ?? []} />
        </section>
      </section>

      <aside className="space-y-4">
        <PlayerPanel
          username={username}
          isAuthenticated={authStatus === "authenticated"}
          balanceCents={walletQuery.data?.balanceCents}
          walletMissing={Boolean(token && walletQuery.isError)}
          onCreateWallet={() => createWallet.mutate()}
          creatingWallet={createWallet.isPending}
        />
        <SeedPanel round={round} />
        <BetControls
          status={round?.status ?? "BETTING"}
          multiplierBps={multiplierBps}
          hasPendingBet={Boolean(myPendingBet)}
          pendingAmountCents={myPendingBet?.amountCents}
          placingBet={placeBet.isPending}
          cashingOut={cashout.isPending}
          onPlaceBet={(amountCents) => {
            if (!token) return signIn("keycloak");
            placeBet.mutate(amountCents);
          }}
          onCashout={() => {
            if (!token) return signIn("keycloak");
            cashout.mutate();
          }}
        />
        <MyBets bets={myBetsQuery.data?.items ?? []} />
      </aside>
    </main>
  );
}

function PlayerPanel({
  username,
  isAuthenticated,
  balanceCents,
  walletMissing,
  onCreateWallet,
  creatingWallet,
}: {
  username: string;
  isAuthenticated: boolean;
  balanceCents?: string;
  walletMissing: boolean;
  onCreateWallet: () => void;
  creatingWallet: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Jogador</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <strong className="block text-lg text-zinc-50">{isAuthenticated ? username : "Nao autenticado"}</strong>
          <span className="text-sm text-zinc-500">{isAuthenticated ? "JWT Keycloak ativo" : "Entre para apostar"}</span>
        </div>
        <WalletIcon className="text-emerald-300" size={28} />
      </div>
      <div className="mt-4 rounded-md bg-black/35 p-3">
        <p className="text-xs text-zinc-500">Saldo</p>
        <strong className="mt-1 block text-3xl text-zinc-50">{formatCents(balanceCents)}</strong>
      </div>
      {walletMissing ? (
        <Button className="mt-3 w-full" variant="secondary" onClick={onCreateWallet} disabled={creatingWallet}>
          Criar carteira
        </Button>
      ) : null}
    </section>
  );
}

function SeedPanel({ round }: { round: Round | null }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Provably fair</p>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">Hash antes da rodada</dt>
          <dd className="break-all font-mono text-xs text-emerald-200">{round?.serverSeedHash ?? "-"}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-zinc-500">Client seed</dt>
            <dd className="font-mono text-xs text-zinc-300">{round?.clientSeed ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Nonce</dt>
            <dd className="font-mono text-xs text-zinc-300">{round?.nonce ?? "-"}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}

function LiveBets({ bets }: { bets: LiveBet[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Apostas da rodada</h2>
        <span className="text-xs text-zinc-500">{bets.length} jogadores</span>
      </div>
      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {bets.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">Aguardando apostas...</p> : null}
        {bets.map((bet) => (
          <div key={bet.betId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-zinc-900/70 px-3 py-2 text-sm">
            <span className="font-mono text-zinc-300">{shortId(bet.playerId, 5)}</span>
            <span className="text-zinc-100">{formatCents(bet.amountCents)}</span>
            <span className={bet.status === "CASHED_OUT" ? "text-emerald-300" : bet.status === "LOST" ? "text-rose-300" : "text-zinc-400"}>
              {bet.status === "CASHED_OUT" ? formatMultiplier(bet.cashoutMultiplierBps) : bet.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoundHistory({ rounds }: { rounds: Round[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Historico</h2>
      <div className="grid grid-cols-3 gap-2">
        {rounds.slice(0, 18).map((item) => {
          const isHigh = (item.crashMultiplierBps ?? 0) >= 20000;
          return (
            <span
              key={item.roundId}
              className={isHigh ? "rounded-md bg-emerald-400/15 px-2 py-2 text-center text-sm font-bold text-emerald-300" : "rounded-md bg-rose-500/15 px-2 py-2 text-center text-sm font-bold text-rose-300"}
            >
              {formatMultiplier(item.crashMultiplierBps)}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function MyBets({ bets }: { bets: Bet[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Minhas ultimas apostas</h2>
      <div className="space-y-2">
        {bets.slice(0, 5).map((bet) => (
          <div key={bet.betId} className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2 text-sm">
            <span className="font-mono text-xs text-zinc-500">{shortId(bet.roundId, 5)}</span>
            <span className="text-zinc-200">{formatCents(bet.amountCents)}</span>
            <span className="text-zinc-400">{bet.status ?? "PLACED"}</span>
          </div>
        ))}
        {bets.length === 0 ? <p className="py-4 text-center text-sm text-zinc-500">Sem apostas ainda</p> : null}
      </div>
    </section>
  );
}
