"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  LogIn,
  LogOut,
  Shield,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { BetControls } from "@/components/game/bet-controls";
import { CrashChart } from "@/components/game/crash-chart";
import { Button } from "@/components/ui/button";
import { getBetStatusLabel, getRoundStatusLabel } from "@/features/game/game-formatters";
import { useWallet } from "@/features/wallet/use-wallet";
import { Bet, crashApi, Round, RoundVerification } from "@/lib/api";
import { verifyCrashRound } from "@/lib/provably-fair";
import { createGameSocket, realtimeEvents } from "@/lib/realtime";
import { cn, formatCents, formatMultiplier, shortId } from "@/lib/utils";
import { MyBets } from "@/features/bets/components/my-bets-summary";

type LiveBet = Bet & {
  status: "PLACED" | "CASHED_OUT" | "LOST";
};

const BETTING_WINDOW_MS = Number(process.env.NEXT_PUBLIC_BETTING_WINDOW_MS ?? 10000);

export function GameDashboard() {
  const { data: session, status: authStatus } = useSession();
  const queryClient = useQueryClient();
  const token = session?.accessToken;
  const username = session?.user.username ?? session?.user.name ?? "visitante";
  const [round, setRound] = useState<Round | null>(null);
  const [multiplierBps, setMultiplierBps] = useState(100);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [submittedBetRoundId, setSubmittedBetRoundId] = useState<string | null>(null);
  const lastRoundNoticeRef = useRef<string | null>(null);
  const playerId = session?.user.id;

  const currentRoundQuery = useQuery({
    queryKey: ["current-round"],
    queryFn: crashApi.getCurrentRound,
    retry: false,
  });

  const wallet = useWallet(token);

  const myBetsQuery = useQuery({
    queryKey: ["my-bets", token],
    queryFn: () => crashApi.getMyBets(token!),
    enabled: Boolean(token),
  });

  const verificationQuery = useQuery({
    queryKey: ["round-verification", round?.roundId],
    queryFn: () => crashApi.getRoundVerification(round!.roundId),
    enabled: Boolean(round?.roundId && ["CRASHED", "SETTLED"].includes(round.status)),
    retry: false,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentRoundQuery.data) {
      setRound(currentRoundQuery.data);
      setMultiplierBps(currentRoundQuery.data.crashMultiplierBps ?? 100);
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
          setMultiplierBps(100);
          setLiveBets([]);
          setSubmittedBetRoundId(null);
          void queryClient.invalidateQueries({ queryKey: ["current-round"] });
          void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
        }

        if (eventName === "round.started") {
          setRound((previous) =>
            previous
              ? {
                  ...previous,
                  status: "RUNNING",
                  runningStartedAt: String(payload.runningStartedAt),
                }
              : previous,
          );
          setMultiplierBps(100);
        }

        if (eventName === "round.multiplier") {
          setMultiplierBps(Number(payload.multiplierBps));
        }

        if (eventName === "round.crashed") {
          const crashedRoundId = String(payload.roundId);
          toast.error("Round crashed", {
            id: `round-crashed:${crashedRoundId}`,
            description: formatMultiplier(Number(payload.crashMultiplierBps)),
          });
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
          setLiveBets((bets) => {
            const playerLost = bets.some(
              (bet) => bet.playerId === playerId && bet.status === "PLACED",
            );
            if (playerLost)
              toast.error("Aposta perdida", {
                id: `bet-lost:${crashedRoundId}:${playerId ?? "anonymous"}`,
                description: "O crash chegou antes do cashout.",
              });
            return bets.map((bet) => (bet.status === "PLACED" ? { ...bet, status: "LOST" } : bet));
          });
          void queryClient.invalidateQueries({ queryKey: ["round-history"] });
          void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
          void queryClient.invalidateQueries({ queryKey: ["round-verification"] });
        }

        if (eventName === "round.settled") {
          void queryClient.invalidateQueries({ queryKey: ["current-round"] });
          void queryClient.invalidateQueries({ queryKey: ["round-history"] });
          void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
        }

        if (eventName === "bet.placed") {
          const bet = payload as LiveBet;
          if (bet.playerId === playerId) {
            setSubmittedBetRoundId(bet.roundId);
          }
          setLiveBets((bets) => [
            { ...bet, status: "PLACED" },
            ...bets.filter((item) => item.betId !== bet.betId),
          ]);
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
  }, [playerId, queryClient]);

  const placeBet = useMutation({
    mutationFn: (amountCents: number) => crashApi.placeBet(token!, amountCents),
    onSuccess: (response) => {
      setSubmittedBetRoundId(response.roundId);
      toast.success("Aposta aceita", { description: formatCents(response.amountCents) });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["my-bets"] });
    },
    onError: (error) => {
      setSubmittedBetRoundId(null);
      toast.error("Aposta recusada", { description: error.message });
    },
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

  const myPendingBet = useMemo(() => {
    const playerId = session?.user.id;
    return liveBets.find((bet) => bet.playerId === playerId && bet.status === "PLACED");
  }, [liveBets, session?.user.id]);
  const hasSubmittedBetForCurrentRound = submittedBetRoundId === round?.roundId;

  const myBets = useMemo(() => {
    const latestById = new Map<string, Bet>();

    for (const bet of myBetsQuery.data?.items ?? []) {
      latestById.set(bet.betId, bet);
    }

    for (const bet of liveBets) {
      if (bet.playerId === playerId) {
        latestById.set(bet.betId, bet);
      }
    }

    return Array.from(latestById.values()).map((bet) => {
      const activeRoundCanHavePlacedBet =
        bet.roundId === round?.roundId && ["BETTING", "RUNNING"].includes(round.status);

      if (bet.status === "PLACED" && !activeRoundCanHavePlacedBet) {
        return { ...bet, status: "LOST" };
      }

      return bet;
    });
  }, [liveBets, myBetsQuery.data?.items, playerId, round?.roundId, round?.status]);

  const bettingRemainingMs =
    round?.status === "BETTING"
      ? Math.max(0, new Date(round.bettingStartedAt).getTime() + BETTING_WINDOW_MS - now)
      : 0;

  useEffect(() => {
    if (wallet.isMissing && Swal.isVisible()) {
      Swal.close();
    }
  }, [wallet.isMissing]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !round?.roundId) return;
    if (wallet.isLoading || wallet.isCreatingWallet || wallet.isMissing || !wallet.wallet) return;
    if (!["RUNNING", "CRASHED"].includes(round.status)) return;

    const noticeKey = `${round.roundId}:${round.status}`;
    if (lastRoundNoticeRef.current === noticeKey) return;
    if (Swal.isVisible() || document.querySelector('[aria-modal="true"]')) return;
    lastRoundNoticeRef.current = noticeKey;

    void Swal.fire({
      title: round.status === "RUNNING" ? "Rodada em andamento" : "Crash revelado",
      text:
        round.status === "RUNNING"
          ? "Próxima entrada em alguns segundos. Você poderá apostar assim que a fase BETTING começar."
          : "Aguarde a próxima rodada para entrar na fase de apostas.",
      icon: "info",
      showConfirmButton: false,
      allowOutsideClick: true,
      allowEscapeKey: true,
      scrollbarPadding: false,
      heightAuto: false,
      background: "#09090b",
      color: "#f4f4f5",
      iconColor: "#34d399",
      customClass: {
        popup: "rounded-lg border border-zinc-800 shadow-2xl shadow-black/60",
        title: "text-zinc-50",
        htmlContainer: "text-zinc-400",
      },
    });
  }, [
    authStatus,
    round?.roundId,
    round?.status,
    wallet.isCreatingWallet,
    wallet.isLoading,
    wallet.isMissing,
    wallet.wallet,
  ]);

  return (
    <main className="flex-1 grid w-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4 min-h-0 flex-1 h-full flex flex-col">
        <header className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Crash Game
            </p>
            <h1 className="mt-1 text-2xl font-black text-zinc-50">Rodada em tempo real</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-md text-sm text-zinc-300">
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
        <RoundEntryNotice round={round} bettingRemainingMs={bettingRemainingMs} />
        <RoundProgress round={round} bettingRemainingMs={bettingRemainingMs} />

        <LiveBets bets={liveBets} />
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start min-h-0 flex-1 h-full flex flex-col">
        <PlayerPanel
          username={username}
          isAuthenticated={authStatus === "authenticated"}
          balanceCents={wallet.wallet?.balanceCents}
          walletMissing={wallet.isMissing}
          onCreateWallet={wallet.createWallet}
          creatingWallet={wallet.isCreatingWallet}
        />
        <SeedPanel round={round} verification={verificationQuery.data} />
        <BetControls
          status={round?.status ?? "BETTING"}
          multiplierBps={multiplierBps}
          hasPendingBet={Boolean(myPendingBet) || hasSubmittedBetForCurrentRound}
          pendingAmountCents={myPendingBet?.amountCents}
          placingBet={placeBet.isPending}
          cashingOut={cashout.isPending}
          isAuthenticated={authStatus === "authenticated"}
          walletExists={Boolean(wallet.wallet)}
          walletPending={wallet.isCreatingWallet || wallet.isLoading}
          balanceCents={wallet.wallet?.balanceCents}
          onPlaceBet={(amountCents) => {
            if (!token) return signIn("keycloak");
            if (!wallet.wallet) {
              toast.error("Crie sua carteira para começar a apostar");
              return;
            }
            setSubmittedBetRoundId(round?.roundId ?? null);
            placeBet.mutate(amountCents);
          }}
          onCashout={() => {
            if (!token) return signIn("keycloak");
            cashout.mutate();
          }}
        />
        <MyBets bets={myBets} hasSlice />
      </aside>
    </main>
  );
}

function RoundEntryNotice({
  round,
  bettingRemainingMs,
}: {
  round: Round | null;
  bettingRemainingMs: number;
}) {
  const status = round?.status ?? "BETTING";

  if (status === "BETTING") {
    return (
      <section className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-200">
          Fase de apostas aberta. Você tem {Math.ceil(bettingRemainingMs / 1000)}s para entrar.
        </p>
      </section>
    );
  }

  if (status === "RUNNING") {
    return (
      <section className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3">
        <p className="text-sm font-semibold text-amber-100">
          Rodada em andamento. Próxima entrada em alguns segundos.
        </p>
        <p className="mt-1 text-xs text-amber-100/70">
          Apostas ficam bloqueadas até a próxima fase BETTING.
        </p>
      </section>
    );
  }

  if (status === "CRASHED" || status === "SETTLED") {
    return (
      <section className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3">
        <p className="text-sm font-semibold text-rose-100">
          Crash revelado. Aguarde a próxima rodada para apostar.
        </p>
      </section>
    );
  }

  return null;
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
          <strong className="block text-lg text-zinc-50">
            {isAuthenticated ? username : "Não autenticado"}
          </strong>
        </div>
        <WalletIcon className="text-emerald-300" size={28} />
      </div>
      <div className="mt-4 rounded-md bg-black/35 p-3">
        <p className="text-xs text-zinc-500">Saldo</p>
        <strong className="mt-1 block text-3xl text-zinc-50">
          {balanceCents ? formatCents(balanceCents) : "Indisponível"}
        </strong>
      </div>
      {walletMissing ? (
        <Button
          className="mt-3 w-full"
          variant="secondary"
          onClick={onCreateWallet}
          disabled={creatingWallet}
        >
          Criar carteira
        </Button>
      ) : null}
    </section>
  );
}

function RoundProgress({
  round,
  bettingRemainingMs,
}: {
  round: Round | null;
  bettingRemainingMs: number;
}) {
  const progress =
    round?.status === "BETTING"
      ? Math.min(
          100,
          Math.max(0, ((BETTING_WINDOW_MS - bettingRemainingMs) / BETTING_WINDOW_MS) * 100),
        )
      : round?.status === "RUNNING"
        ? 100
        : 0;

  return (
    <section className={cn("rounded-lg border bg-zinc-950/80 p-4", getRoundStatusPanelClassName(round?.status))}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Estado da rodada
          </p>
          <strong className={cn("mt-1 block text-lg", getRoundStatusTextClassName(round?.status))}>
            {getRoundStatusLabel(round?.status)}
          </strong>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
          <Clock3 size={16} className="text-cyan-300" />
          {round?.status === "BETTING"
            ? `${Math.ceil(bettingRemainingMs / 1000)}s para apostar`
            : shortId(round?.roundId, 6)}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

function getRoundStatusPanelClassName(status?: string) {
  if (status === "BETTING") return "border-emerald-400/30";
  if (status === "RUNNING") return "border-amber-300/30";
  if (status === "CRASHED" || status === "SETTLED") return "border-rose-400/30";
  return "border-zinc-800";
}

function getRoundStatusTextClassName(status?: string) {
  if (status === "BETTING") return "text-emerald-200";
  if (status === "RUNNING") return "text-amber-100";
  if (status === "CRASHED" || status === "SETTLED") return "text-rose-100";
  return "text-zinc-100";
}

function SeedPanel({
  round,
  verification,
}: {
  round: Round | null;
  verification?: RoundVerification;
}) {
  const [localCheck, setLocalCheck] = useState<Awaited<ReturnType<typeof verifyCrashRound>> | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopiedText(text);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!verification) {
        setLocalCheck(null);
        return;
      }

      const result = await verifyCrashRound(verification);
      if (!cancelled) setLocalCheck(result);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [verification]);

  const verified =
    Boolean(verification?.verified) &&
    Boolean(localCheck?.hashMatches) &&
    Boolean(localCheck?.multiplierMatches);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Provably fair
        </p>
        {verification ? (
          <span
            className={
              verified
                ? "inline-flex items-center gap-1 text-xs font-semibold text-emerald-300"
                : "inline-flex items-center gap-1 text-xs font-semibold text-rose-300"
            }
          >
            {verified ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {verified ? "Verificado" : "Divergente"}
          </span>
        ) : null}
      </div>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">Hash antes da rodada</dt>
          <div className="flex items-center justify-between">
            <dd className="break-all font-mono text-xs text-emerald-200 truncate">
              {round?.serverSeedHash ?? "-"}
            </dd>
            <button
              type="button"
              onClick={() => handleCopy(round?.serverSeedHash ?? "")}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              title="Copiar ID da rodada"
            >
              {copied && copiedText === round?.serverSeedHash ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
        {verification ? (
          <div>
            <dt className="text-zinc-500">Server seed revelada</dt>
            <div className="flex items-center justify-between">
              <dd className="break-all font-mono text-xs text-zinc-300 truncate">
                {verification.serverSeed}
              </dd>
              <button
                type="button"
                onClick={() => handleCopy(verification.serverSeed)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                title="Copiar ID da rodada"
              >
                {copied && copiedText === verification.serverSeed ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-zinc-500">Client seed</dt>
            <div className="flex items-center justify-between">
              <dd className="font-mono text-xs text-zinc-300 truncate">
                {verification?.clientSeed ?? round?.clientSeed ?? "-"}
              </dd>
              <button
                type="button"
                onClick={() => handleCopy(verification?.clientSeed ?? round?.clientSeed ?? "")}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                title="Copiar ID da rodada"
              >
                {copied && copiedText === (verification?.clientSeed ?? round?.clientSeed) ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
          <div>
            <dt className="text-zinc-500">Nonce</dt>
            <div className="flex items-center justify-between">
              <dd className="font-mono text-xs text-zinc-300 truncate">
                {verification?.nonce ?? round?.nonce ?? "-"}
              </dd>
              <button
                type="button"
                onClick={() => handleCopy(String(verification?.nonce ?? round?.nonce ?? ""))}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                title="Copiar ID da rodada"
              >
                {copied && copiedText === String(verification?.nonce ?? round?.nonce) ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
        {verification ? (
          <div className="grid grid-cols-2 gap-3 rounded-md bg-black/30 p-3">
            <div>
              <dt className="text-zinc-500">Crash oficial</dt>
              <dd className="text-zinc-100">{formatMultiplier(verification.crashMultiplierBps)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Recalculado</dt>
              <dd className="text-zinc-100">{formatMultiplier(localCheck?.crashMultiplierBps)}</dd>
            </div>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function LiveBets({ bets }: { bets: LiveBet[] }) {
  return (
    <section className="flex-1 h-full rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Apostas da rodada
        </h2>
        <span className="text-xs text-zinc-500">{bets.length} jogadores</span>
      </div>
      <div className={`h-full min-h-0 flex flex-col ${bets.length === 0 ? 'justify-center': 'justify-start'} space-y-2 overflow-auto`}>
        {bets.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Aguardando apostas...</p>
        ) : null}
        {bets.map((bet) => (
          <div
            key={bet.betId}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-zinc-900/70 px-3 py-2 text-sm"
          >
            <span className="font-mono text-zinc-300">{shortId(bet.playerId, 5)}</span>
            <span className="text-zinc-100">{formatCents(bet.amountCents)}</span>
            <span
              className={
                bet.status === "CASHED_OUT"
                  ? "text-emerald-300"
                  : bet.status === "LOST"
                    ? "text-rose-300"
                    : "text-zinc-400"
              }
            >
              {bet.status === "CASHED_OUT"
                ? formatMultiplier(bet.cashoutMultiplierBps)
                : getBetStatusLabel(bet.status)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
