import { WalletClient } from "@/application/clients/wallet.client";
import {
  WalletCreditCashoutRequest,
  WalletDebitBetRequest,
  WalletOperationResponse,
} from "@crash/contracts";

export class FakeWalletClient extends WalletClient {
  debitBetCalls: WalletDebitBetRequest[] = [];
  creditCashoutCalls: WalletCreditCashoutRequest[] = [];

  constructor(private debitBetResponse: WalletOperationResponse) {
    super();
  }

  async debitBet(input: WalletDebitBetRequest): Promise<WalletOperationResponse> {
    this.debitBetCalls.push(input);
    return this.debitBetResponse;
  }

  creditCashout(input: WalletCreditCashoutRequest): Promise<WalletOperationResponse> {
    this.creditCashoutCalls.push(input);
    throw new Error("creditCashout should not be called");
  }
}
