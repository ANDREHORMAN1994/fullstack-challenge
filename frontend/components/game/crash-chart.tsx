"use client";

import { useEffect, useRef } from "react";
import { formatMultiplier } from "@/lib/utils";

type CrashChartProps = {
  multiplierBps: number;
  status: string;
  crashedAtBps?: number;
};

export function CrashChart({ multiplierBps, status, crashedAtBps }: CrashChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = 28;
    const width = rect.width - padding * 2;
    const height = rect.height - padding * 2;
    const maxMultiplier = Math.max(2, multiplierBps / 10000 + 0.6, (crashedAtBps ?? 0) / 10000);

    ctx.strokeStyle = "rgba(63, 63, 70, 0.55)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const y = padding + (height / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
    gradient.addColorStop(0, "#34d399");
    gradient.addColorStop(0.72, "#facc15");
    gradient.addColorStop(1, status === "CRASHED" ? "#fb7185" : "#22d3ee");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();

    const points = 80;
    for (let i = 0; i <= points; i += 1) {
      const progress = i / points;
      const eased = Math.pow(progress, 1.85);
      const value = 1 + ((multiplierBps / 10000 - 1) * eased);
      const x = padding + width * progress;
      const y = padding + height - ((value - 1) / (maxMultiplier - 1)) * height;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = status === "CRASHED" ? "#fb7185" : "#34d399";
    ctx.beginPath();
    ctx.arc(padding + width, padding + height - ((multiplierBps / 10000 - 1) / (maxMultiplier - 1)) * height, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [crashedAtBps, multiplierBps, status]);

  return (
    <section className="relative min-h-[320px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute left-5 top-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Multiplicador</p>
        <strong className="mt-2 block text-6xl font-black text-zinc-50 sm:text-7xl">
          {formatMultiplier(status === "CRASHED" && crashedAtBps ? crashedAtBps : multiplierBps)}
        </strong>
      </div>
      <div className="absolute bottom-5 left-5 rounded-md border border-zinc-800 bg-black/45 px-3 py-2 text-sm text-zinc-300">
        {status === "BETTING" ? "Apostas abertas" : status === "RUNNING" ? "Rodada em andamento" : "Crash revelado"}
      </div>
    </section>
  );
}
