import { Injectable } from "@nestjs/common";
import { WalletClient } from "../clients/wallet.client";
import { Bet } from "@/domain/entities/bet.entity";
import { BetsRepository } from "../repositories/bet.repository";
import { RoundsRepository } from "../repositories/rounds.repository";

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
  constructor(
    private walletClient: WalletClient,
    private betsRepository: BetsRepository,
    private roundsRepository: RoundsRepository,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.ensureAcceptsBets();

    if (input.roundId.trim() !== currentRound.id) {
      throw new Error("Bet round does not match current round");
    }

    const bet = new Bet({
      id: input.betId,
      playerId: input.playerId,
      roundId: currentRound.id,
      amountCents: BigInt(input.amountCents),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const existingBet = await this.betsRepository.findByRoundIdAndPlayerId(
      bet.roundId,
      bet.playerId,
    );

    if (existingBet) {
      throw new Error("Player already placed a bet in this round");
    }

    const operationId = `bet-debit:${bet.id}`;

    const response = await this.walletClient.debitBet({
      playerId: bet.playerId,
      operationId,
      amountCents: bet.amountCents.toString(),
      referenceRoundId: bet.roundId,
      referenceBetId: bet.id,
    });

    if (response.ok === false) {
      throw new Error(`Wallet debit failed: ${response.error.code}`);
    }

    const savedBet = await this.betsRepository.create(bet);

    return {
      accepted: true,
      betId: savedBet.id,
      playerId: savedBet.playerId,
      roundId: savedBet.roundId,
      amountCents: savedBet.amountCents.toString(),
      walletTransactionId: response.transaction.id,
      walletBalanceAfterCents: response.transaction.balanceAfterCents,
    };
  }
}
