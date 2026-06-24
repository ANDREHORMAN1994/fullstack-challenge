"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { BarChart3, Gamepad2, History, LogOut, Menu, Wallet } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentPlayer } from "@/features/player/use-current-player";
import { useWallet } from "@/features/wallet/use-wallet";
import { useWalletOnboarding } from "@/features/wallet/use-wallet-onboarding";
import { WalletOnboardingModal } from "@/features/wallet/wallet-onboarding-modal";
import { WalletRequiredNotice } from "@/features/wallet/wallet-required-notice";
import { cn, formatCents, shortId } from "@/lib/utils";

const navItems = [
  { href: "/game", label: "Game", icon: Gamepad2 },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/my-bets", label: "My Bets", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
];

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const player = useCurrentPlayer();
  const { wallet } = useWallet(player.accessToken);
  const onboarding = useWalletOnboarding();

  return (
    <div className="min-h-screen bg-black/10 text-zinc-100 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 shadow-2xl shadow-black/40 lg:flex lg:flex-col">
        <Link href="/game" className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-400 text-black">
            <Gamepad2 size={22} />
          </span>
          <span>
            <strong className="block text-sm text-zinc-50">Crash Game</strong>
            <span className="text-xs text-zinc-500">Realtime casino</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100",
                  active && "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/20",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-zinc-800 pt-4">
          <div className="rounded-md bg-black/30 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              {player.username ?? shortId(player.playerId)}
            </p>
            {wallet ? (
              <span className="mt-1 block text-xs text-emerald-300">
                {formatCents(wallet.balanceCents)}
              </span>
            ) : null}
          </div>
          <Button
            className="w-full justify-start"
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/game" className="inline-flex items-center gap-2 font-semibold text-zinc-50">
            <Gamepad2 size={20} className="text-emerald-300" />
            Crash Game
          </Link>
          <Menu size={20} className="text-zinc-400" />
        </div>
        <nav className="mt-3 grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100",
                  active && "bg-emerald-400/12 text-emerald-200",
                )}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-h-screen px-4 py-4 lg:px-6 lg:py-6 flex flex-col items-center">
        {onboarding.walletRequired ? (
          <div className="mx-auto mb-4 max-w-7xl">
            <WalletRequiredNotice />
          </div>
        ) : null}
        {children}
      </main>

      <WalletOnboardingModal
        open={onboarding.shouldShowModal}
        creating={onboarding.isCreatingWallet}
        onCreateWallet={onboarding.createWallet}
        onDismiss={onboarding.dismiss}
      />
    </div>
  );
}
