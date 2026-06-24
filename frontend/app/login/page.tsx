"use client";

import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => undefined);
  }, []);

  if (status === "authenticated") {
    redirect("/game");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050506] px-4 py-6">
      <div className="login-aurora absolute inset-0 opacity-80" />
      <section
        className="relative min-h-[calc(100vh-3rem)] w-full h-full flex flex-col max-w-7xl overflow-hidden rounded-lg
        border border-zinc-800 bg-zinc-950/70 shadow-2xl shadow-black/50"
      >
        <div
          className="absolute inset-0
          bg-[radial-gradient(circle_at_30%_20%,rgba(52,211,153,0.22),transparent_24rem),radial-gradient(circle_at_75%_65%,rgba(244,63,94,0.18),transparent_24rem)]"
        />
        <div className="relative min-w-0 min-h-0 flex-1 w-full h-full flex flex-col items-center justify-center sm:justify-between p-10">
          {/* Animation Circles */}
          <div
            className="crash-orbit absolute left-1/2 top-1/2 h-80 w-80 mt-20
            -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/20"
          />
          <div
            className="crash-orbit crash-orbit-delay absolute left-1/2 top-1/2
            h-112 w-md -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-300/20"
          />

          <div className="w-full hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Crash Game
            </p>
            <h1 className="mt-4 max-w-2xl text-6xl font-black leading-none text-zinc-50">
              Apostas em tempo real. Saque antes do crash.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
              Entre com Keycloak, acompanhe o multiplicador ao vivo e use cashout antes que a rodada
              revele o ponto de crash.
            </p>
          </div>

          <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-black/35 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Crash Game
            </p>
            <h2 className="mt-2 text-3xl font-black text-zinc-50">Entrar no jogo</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Use o Keycloak local para receber seu JWT e acessar a mesa, carteira, apostas e
              histórico em tempo real.
            </p>

            <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <KeyRound size={16} className="text-emerald-300" />
                Credenciais demo
              </p>
              <dl className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                <dt className="text-zinc-500">username</dt>
                <dd className="font-mono text-zinc-100">player</dd>
                <dt className="text-zinc-500">password</dt>
                <dd className="font-mono text-zinc-100">player123</dd>
              </dl>
            </div>

            <Button
              className="mt-6 w-full"
              onClick={() => {
                setIsRedirecting(true);
                void signIn("keycloak", { callbackUrl: "/game" });
              }}
              disabled={isRedirecting}
            >
              {isRedirecting ? <Loader2 size={18} className="animate-spin" /> : null}
              {isRedirecting ? "Entrando..." : "Entrar com Keycloak"}
            </Button>
          </section>

          <div className="w-full hidden sm:grid grid-cols-3 gap-4 md:gap-20 justify-between">
            {["BETTING", "RUNNING", "CASHOUT"].map((label, index) => (
              <div key={label} className="w-full rounded-md border border-zinc-800 bg-black/30 p-3">
                <span className="text-xs font-semibold text-zinc-500">{label}</span>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="login-pulse h-full rounded-full bg-emerald-300"
                    style={{ "--pulse-duration": `${(index + 2.5) * 2}s` } as CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
