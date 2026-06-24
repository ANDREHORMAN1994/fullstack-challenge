import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-emerald-400 text-black hover:bg-emerald-300",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
    ghost: "bg-transparent text-zinc-300 hover:bg-zinc-900",
  };

  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
