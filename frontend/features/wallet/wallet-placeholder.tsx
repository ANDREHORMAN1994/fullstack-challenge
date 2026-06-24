"use client";

import { Wallet } from "lucide-react";
import { CreateWalletButton } from "@/features/wallet/create-wallet-button";
import { demoWalletCreditEnabled } from "@/features/wallet/demo-wallet-config";
import { useCurrentPlayer } from "@/features/player/use-current-player";
import { WalletBalanceCard } from "@/features/wallet/wallet-balance-card";
import { useWallet } from "@/features/wallet/use-wallet";

export function WalletPlaceholder() {
  const player = useCurrentPlayer();
  const { wallet, isMissing, isLoading, createWallet, isCreatingWallet } = useWallet(player.accessToken);

  return (
    <section className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Wallet</p>
          <h1 className="mt-1 text-3xl font-black text-zinc-50">Carteira</h1>
        </div>
        <Wallet size={28} className="text-emerald-300" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <WalletBalanceCard wallet={wallet} />
        <article className="rounded-lg border border-zinc-800 bg-black/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Status</p>
          <strong className="mt-2 block text-xl text-zinc-50">
            {isLoading ? "Carregando carteira" : wallet ? "Carteira ativa" : "Carteira obrigatória"}
          </strong>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {demoWalletCreditEnabled
              ? "O ambiente de avaliação cria a carteira com 1000 créditos persistidos pelo Wallet Service. Fora desse modo, a flag de demo deve ficar desligada."
              : "O saldo exibido nesta pagina vem sempre do Wallet Service."}
          </p>
          {wallet ? (
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
              <dt className="text-zinc-500">Wallet ID</dt>
              <dd className="break-all font-mono text-zinc-300">{wallet.id}</dd>
              <dt className="text-zinc-500">Player ID</dt>
              <dd className="break-all font-mono text-zinc-300">{wallet.playerId}</dd>
              <dt className="text-zinc-500">Criada em</dt>
              <dd className="text-zinc-300">{new Date(wallet.createdAt).toLocaleString("pt-BR")}</dd>
            </dl>
          ) : null}
        </article>
      </div>
      {isMissing ? (
        <div className="mt-4">
          <CreateWalletButton onCreateWallet={createWallet} creating={isCreatingWallet} />
        </div>
      ) : null}
    </section>
  );
}
