import { Injectable } from "@nestjs/common";
import { WalletClient } from "../clients/wallet.client";
import { BetsRepository } from "../repositories/bet.repository";
import { RoundsRepository } from "../repositories/rounds.repository";
import { Round } from "@/domain/entities/round.entity";

export type CashoutBetInput = {
  playerId: string;
};

export type CashoutBetOutput = {
  cashedOut: true;
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  cashoutMultiplierBps: number;
  payoutCents: string;
  walletTransactionId: string;
  walletBalanceAfterCents: string;
};

@Injectable()
export class CashoutBetUseCase {
  constructor(
    private walletClient: WalletClient,
    private betsRepository: BetsRepository,
    private roundsRepository: RoundsRepository,
  ) {}

  async execute(input: CashoutBetInput, now = new Date()): Promise<CashoutBetOutput> {
    const playerId = input.playerId.trim();
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      throw new Error("No active round");
    }

    currentRound.ensureAcceptsCashout();

    const bet = await this.betsRepository.findByRoundIdAndPlayerId(
      currentRound.id,
      playerId,
    );

    if (!bet) {
      throw new Error("Player has no bet in current round");
    }

    const cashoutMultiplierBps = this.calculateCurrentMultiplierBps(currentRound, now);
    const payoutCents = bet.cashout(cashoutMultiplierBps, now);
    const operationId = `cashout-credit:${bet.id}`;

    const response = await this.walletClient.creditCashout({
      playerId: bet.playerId,
      operationId,
      amountCents: payoutCents.toString(),
      referenceRoundId: bet.roundId,
      referenceBetId: bet.id,
    });

    if (response.ok === false) {
      throw new Error(`Wallet cashout credit failed: ${response.error.code}`);
    }

    const savedBet = await this.betsRepository.create(bet);

    return {
      cashedOut: true,
      betId: savedBet.id,
      playerId: savedBet.playerId,
      roundId: savedBet.roundId,
      amountCents: savedBet.amountCents.toString(),
      cashoutMultiplierBps: savedBet.getCashoutMultiplierBps() ?? cashoutMultiplierBps,
      payoutCents: (savedBet.getPayoutCents() ?? payoutCents).toString(),
      walletTransactionId: response.transaction.id,
      walletBalanceAfterCents: response.transaction.balanceAfterCents,
    };
  }

  private calculateCurrentMultiplierBps(round: Round, now: Date): number {
    const runningStartedAt = round.getRunningStartedAt();

    if (!runningStartedAt) {
      throw new Error("Running round is missing running start timestamp");
    }

    const elapsedMs = Math.max(0, now.getTime() - runningStartedAt.getTime());
    const multiplierBps = 100 + Math.floor(elapsedMs / 100);

    if (multiplierBps >= round.crashMultiplierBps) {
      throw new Error("Round has already reached the crash multiplier");
    }

    return multiplierBps;
  }
}
