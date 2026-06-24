"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { ApiError, crashApi } from "@/lib/api";

function isUnauthorized(error: Error) {
  return error instanceof ApiError && error.status === 401;
}

function forceReauthentication() {
  toast.error("Sessão expirada", {
    description: "Entre novamente para renovar o token do Keycloak.",
  });
  void signOut({ callbackUrl: "/login" });
}

export function useWallet(accessToken?: string) {
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    queryKey: ["wallet", accessToken],
    queryFn: () => crashApi.getWallet(accessToken!),
    enabled: Boolean(accessToken),
    retry: false,
  });

  useEffect(() => {
    if (walletQuery.error && isUnauthorized(walletQuery.error)) {
      forceReauthentication();
    }
  }, [walletQuery.error]);

  const createWallet = useMutation({
    mutationFn: () => crashApi.createWallet(accessToken!),
    onSuccess: () => {
      toast.success("Carteira criada", { description: "Saldo demo confirmado pelo backend." });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error) => {
      if (isUnauthorized(error)) {
        forceReauthentication();
        return;
      }

      if (error.message.includes("Wallet already exists")) {
        toast.success("Carteira encontrada");
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        return;
      }

      toast.error("Não foi possível criar carteira", { description: error.message });
    },
  });

  return {
    wallet: walletQuery.data,
    isLoading: walletQuery.isLoading,
    isFetching: walletQuery.isFetching,
    error: walletQuery.error,
    isMissing: Boolean(accessToken && walletQuery.isError),
    createWallet: () => createWallet.mutate(),
    isCreatingWallet: createWallet.isPending,
  };
}
