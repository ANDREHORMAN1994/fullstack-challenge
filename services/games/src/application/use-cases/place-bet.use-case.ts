import { Injectable } from "@nestjs/common";
import { WalletClient } from "../clients/wallet.client";
import { Bet } from "@/domain/entities/bet.entity";
import { BetsRepository } from "../repositories/bet.repository";
import { RoundsRepository } from "../repositories/rounds.repository";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

export type PlaceBetInput = {
  playerId: string;
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
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.ensureAcceptsBets();

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
    const output = {
      accepted: true as const,
      betId: savedBet.id,
      playerId: savedBet.playerId,
      roundId: savedBet.roundId,
      amountCents: savedBet.amountCents.toString(),
      walletTransactionId: response.transaction.id,
      walletBalanceAfterCents: response.transaction.balanceAfterCents,
    };

    this.gameEventsPublisher.publish({
      name: "bet.placed",
      payload: {
        betId: output.betId,
        playerId: output.playerId,
        roundId: output.roundId,
        amountCents: output.amountCents,
      },
    });

    return output;
  }
}
