"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, HandCoins, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsFromDecimalString, formatCents, formatMultiplier } from "@/lib/utils";

const betSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+([,.]\d{1,2})?$/, "Use um valor como 10,00")
    .refine((value) => {
      const cents = centsFromDecimalString(value);
      return cents >= 100 && cents <= 100000;
    }, "Aposta entre R$ 1,00 e R$ 1.000,00"),
});

type BetForm = z.infer<typeof betSchema>;

type BetControlsProps = {
  status: string;
  multiplierBps: number;
  hasPendingBet: boolean;
  pendingAmountCents?: string;
  onPlaceBet: (amountCents: number) => void;
  onCashout: () => void;
  placingBet: boolean;
  cashingOut: boolean;
  isAuthenticated: boolean;
  walletExists: boolean;
  walletPending: boolean;
  balanceCents?: string;
};

export function BetControls({
  status,
  multiplierBps,
  hasPendingBet,
  pendingAmountCents,
  onPlaceBet,
  onCashout,
  placingBet,
  cashingOut,
  isAuthenticated,
  walletExists,
  walletPending,
  balanceCents,
}: BetControlsProps) {
  const form = useForm<BetForm>({
    resolver: zodResolver(betSchema),
    defaultValues: { amount: "10,00" },
  });

  const potentialPayout =
    pendingAmountCents && hasPendingBet
      ? (BigInt(pendingAmountCents) * BigInt(multiplierBps)) / 10000n
      : 0n;
  const amountValue = form.watch("amount");
  const parsedAmountCents = centsFromDecimalString(amountValue || "0");
  const amountCents = Number.isFinite(parsedAmountCents) ? parsedAmountCents : 0;
  const hasInsufficientBalance = walletExists && BigInt(balanceCents ?? 0) < BigInt(amountCents);
  const roundBlocksBetting = status !== "BETTING";
  const betDisabled =
    !isAuthenticated ||
    !walletExists ||
    walletPending ||
    roundBlocksBetting ||
    hasInsufficientBalance ||
    placingBet;
  const betMessage = !isAuthenticated
    ? "Entre para apostar"
    : !walletExists
      ? "Crie sua carteira para começar a apostar"
      : walletPending
        ? "Criando carteira..."
        : hasInsufficientBalance
          ? "Saldo insuficiente"
          : roundBlocksBetting
            ? "Aguarde a próxima rodada"
            : null;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Mesa</h2>
        <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300">
          {status}
        </span>
      </div>

      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(
          (data) => onPlaceBet(centsFromDecimalString(data.amount)),
          () => toast.error("Valor inválido", { description: "Use um valor entre R$ 1,00 e R$ 1.000,00." }),
        )}
      >
        <label className="block text-xs font-medium text-zinc-500" htmlFor="amount">
          Valor da aposta
        </label>
        <Input id="amount" inputMode="decimal" {...form.register("amount")} disabled={roundBlocksBetting || walletPending} />
        {form.formState.errors.amount ? (
          <p className="text-xs text-rose-300">{form.formState.errors.amount.message}</p>
        ) : null}
        {betMessage ? <p className="text-xs text-amber-200">{betMessage}</p> : null}
        <Button className="w-full" type="submit" disabled={betDisabled}>
          {placingBet ? <Loader2 size={18} className="animate-spin" /> : <Banknote size={18} />}
          Apostar
        </Button>
      </form>

      <div className="mt-5 rounded-md border border-zinc-800 bg-black/30 p-3">
        <p className="text-xs text-zinc-500">Pagamento potencial em {formatMultiplier(multiplierBps)}</p>
        <strong className="mt-1 block text-2xl text-emerald-300">{formatCents(potentialPayout)}</strong>
      </div>

      <Button
        className="mt-3 w-full"
        variant="danger"
        onClick={onCashout}
        disabled={status !== "RUNNING" || !hasPendingBet || cashingOut}
      >
        {cashingOut ? <Loader2 size={18} className="animate-spin" /> : <HandCoins size={18} />}
        Sacar
      </Button>
    </section>
  );
}
