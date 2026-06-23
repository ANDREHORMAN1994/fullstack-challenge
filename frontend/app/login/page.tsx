"use client";

import { signIn } from "next-auth/react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950/85 p-6 shadow-2xl shadow-black/50">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-400 text-black">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-50">Entrar no Crash Game</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Use o Keycloak local para receber um JWT e jogar com saldo, apostas e cashout
          autenticados.
        </p>
        <Button className="mt-6 w-full" onClick={() => signIn("keycloak", { callbackUrl: "/" })}>
          Entrar com Keycloak
        </Button>
      </section>
    </main>
  );
}
