import { Wallet as WalletIcon } from "lucide-react";
import type { Wallet } from "@/lib/api";
import { formatCents } from "@/lib/formatters/money";

export function WalletBalanceCard({ wallet }: { wallet?: Wallet }) {
  return (
    <article className="rounded-lg border border-zinc-800 bg-black/30 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Saldo real</p>
        <WalletIcon size={20} className="text-emerald-300" />
      </div>
      <strong className="block text-4xl text-zinc-50">{wallet ? formatCents(wallet.balanceCents) : "Indisponível"}</strong>
      {wallet ? <span className="mt-2 block text-sm text-zinc-500">{wallet.currency}</span> : null}
    </article>
  );
}
