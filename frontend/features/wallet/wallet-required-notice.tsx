import { Wallet } from "lucide-react";

export function WalletRequiredNotice() {
  return (
    <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-100">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet size={16} />
        Crie sua carteira para começar a apostar
      </p>
    </div>
  );
}
