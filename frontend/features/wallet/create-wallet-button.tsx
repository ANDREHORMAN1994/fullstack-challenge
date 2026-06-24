import { Wallet } from "lucide-react";
import { demoWalletCreditEnabled } from "@/features/wallet/demo-wallet-config";

type CreateWalletButtonProps = {
  onCreateWallet: () => void;
  creating: boolean;
};

export function CreateWalletButton({ onCreateWallet, creating }: CreateWalletButtonProps) {
  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onCreateWallet}
      disabled={creating}
    >
      <Wallet size={18} />
      {creating
        ? "Criando carteira..."
        : demoWalletCreditEnabled
          ? "Criar carteira e receber 1000 créditos"
          : "Criar carteira"}
    </button>
  );
}
