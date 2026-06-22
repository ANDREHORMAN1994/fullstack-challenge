import { WalletClient } from "@/application/clients/wallet.client";
import { ClientProxy } from "@nestjs/microservices";
import {
  WALLET_MESSAGE_PATTERNS,
  WalletCreditCashoutRequest,
  WalletDebitBetRequest,
  WalletOperationResponse,
} from "@crash/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export const WALLET_RMQ_CLIENT = Symbol("WALLET_RMQ_CLIENT");

@Injectable()
export class RabbitmqWalletClient extends WalletClient {
  constructor(@Inject(WALLET_RMQ_CLIENT) private readonly client: ClientProxy) {
    super();
  }

  debitBet(input: WalletDebitBetRequest): Promise<WalletOperationResponse> {
    return firstValueFrom(
      this.client.send<WalletOperationResponse, WalletDebitBetRequest>(
        WALLET_MESSAGE_PATTERNS.DEBIT_BET,
        input,
      ),
    );
  }

  creditCashout(input: WalletCreditCashoutRequest): Promise<WalletOperationResponse> {
    return firstValueFrom(
      this.client.send<WalletOperationResponse, WalletCreditCashoutRequest>(
        WALLET_MESSAGE_PATTERNS.CREDIT_CASHOUT,
        input,
      ),
    );
  }
}
