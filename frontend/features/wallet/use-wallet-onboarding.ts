"use client";

import { useState } from "react";
import { useCurrentPlayer } from "@/features/player/use-current-player";
import { useWallet } from "@/features/wallet/use-wallet";

export function useWalletOnboarding() {
  const player = useCurrentPlayer();
  const walletState = useWallet(player.accessToken);
  const [dismissed, setDismissed] = useState(false);

  const walletRequired = player.isAuthenticated && walletState.isMissing;
  const shouldShowModal = walletRequired && !dismissed;

  return {
    player,
    wallet: walletState.wallet,
    isLoadingWallet: walletState.isLoading,
    isFetchingWallet: walletState.isFetching,
    walletRequired,
    shouldShowModal,
    dismiss: () => setDismissed(true),
    createWallet: walletState.createWallet,
    isCreatingWallet: walletState.isCreatingWallet,
    error: walletState.error,
  };
}
