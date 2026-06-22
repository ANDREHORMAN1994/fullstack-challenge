import { Injectable } from "@nestjs/common";
import { WalletClient } from "../clients/wallet.client";

export type PlaceBetInput = {
  playerId: string;
  roundId: string;
  betId: string;
  amountCents: string;
};

export type PlaceBetOutput = {
  accepted: true;
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  walletTransactionId: string;
  walletBalanceAfterCents: string;
};

@Injectable()
export class PlaceBetUseCase {
  constructor(private walletClient: WalletClient) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const operationId = `bet-debit:${input.betId}`;

    const response = await this.walletClient.debitBet({
      playerId: input.playerId,
      operationId,
      amountCents: input.amountCents,
      referenceRoundId: input.roundId,
      referenceBetId: input.betId,
    });

    if (response.ok === false) {
      throw new Error(`Wallet debit failed: ${response.error.code}`);
    }

    return {
      accepted: true,
      betId: input.betId,
      playerId: input.playerId,
      roundId: input.roundId,
      amountCents: input.amountCents,
      walletTransactionId: response.transaction.id,
      walletBalanceAfterCents: response.transaction.balanceAfterCents,
    };
  }
}
