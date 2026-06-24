"use client";

import { Coins, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoWalletCreditEnabled, demoWalletCreditLabel } from "@/features/wallet/demo-wallet-config";

type WalletOnboardingModalProps = {
  open: boolean;
  creating: boolean;
  onCreateWallet: () => void;
  onDismiss: () => void;
};

export function WalletOnboardingModal({
  open,
  creating,
  onCreateWallet,
  onDismiss,
}: WalletOnboardingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-sm">
      <section className="grid w-full max-w-3xl overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 md:grid-cols-[1fr_1.15fr]">
        <div className="relative min-h-64 overflow-hidden bg-black p-6">
          <div className="wallet-glow absolute inset-0" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 shadow-2xl shadow-emerald-400/20">
              <Wallet size={46} className="text-emerald-200" />
              <Coins className="wallet-coin absolute -right-2 top-4 text-amber-300" size={28} />
              <Coins className="wallet-coin wallet-coin-delay absolute bottom-4 left-0 text-amber-200" size={22} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Demo bankroll</p>
              <strong className="mt-2 block text-3xl text-zinc-50">
                {demoWalletCreditEnabled ? demoWalletCreditLabel : "Carteira real"}
              </strong>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Bem-vindo</p>
          <h2 className="mt-2 text-3xl font-black text-zinc-50">Crie sua carteira para jogar</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            A carteira é obrigatória para apostar e receber cashouts.
            {demoWalletCreditEnabled
              ? " Neste ambiente demo, a criação concede 1000 créditos reais no banco para avaliação e testes."
              : " O saldo exibido sempre vem do Wallet Service."}
          </p>
          <div className="mt-5 rounded-md border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-300">
            O saldo so aparece depois que o Wallet Service confirmar a carteira persistida.
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={onCreateWallet} disabled={creating}>
              <Wallet size={18} />
              {creating
                ? "Criando carteira..."
                : demoWalletCreditEnabled
                  ? "Criar carteira e receber 1000 créditos"
                  : "Criar carteira"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
