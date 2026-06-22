export const WALLET_MESSAGE_PATTERNS = {
  DEBIT_BET: "wallets.debit-bet",
  CREDIT_CASHOUT: "wallets.credit-cashout",
} as const;

export type WalletMessagePattern =
  (typeof WALLET_MESSAGE_PATTERNS)[keyof typeof WALLET_MESSAGE_PATTERNS];

export type WalletTransactionType = "BET_DEBIT" | "CASHOUT_CREDIT";

export type WalletOperationRequest = {
  playerId: string;
  operationId: string;
  amountCents: string;
  referenceRoundId: string;
  referenceBetId: string;
};

export type WalletDebitBetRequest = WalletOperationRequest;

export type WalletCreditCashoutRequest = WalletOperationRequest;

export type WalletTransactionResponse = {
  id: string;
  operationId: string;
  type: WalletTransactionType;
  amountCents: string;
  currency: string;
  balanceBeforeCents: string;
  balanceAfterCents: string;
  referenceRoundId?: string;
  referenceBetId?: string;
  createdAt: string;
};

export type WalletOperationErrorCode =
  | "WALLET_NOT_FOUND"
  | "INSUFFICIENT_BALANCE"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export type WalletOperationSuccessResponse = {
  ok: true;
  transaction: WalletTransactionResponse;
};

export type WalletOperationErrorResponse = {
  ok: false;
  error: {
    code: WalletOperationErrorCode;
    message: string;
  };
};

export type WalletOperationResponse = WalletOperationSuccessResponse | WalletOperationErrorResponse;
