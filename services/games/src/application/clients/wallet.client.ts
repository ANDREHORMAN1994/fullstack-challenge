import type {
  WalletCreditCashoutRequest,
  WalletDebitBetRequest,
  WalletOperationResponse,
} from "@crash/contracts";

export abstract class WalletClient {
  abstract debitBet(input: WalletDebitBetRequest): Promise<WalletOperationResponse>;

  abstract creditCashout(input: WalletCreditCashoutRequest): Promise<WalletOperationResponse>;
}
