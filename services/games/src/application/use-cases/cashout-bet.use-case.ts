import { Injectable } from "@nestjs/common";
import { WalletClient } from "../clients/wallet.client";
import { BetsRepository } from "../repositories/bet.repository";
import { RoundsRepository } from "../repositories/rounds.repository";
import { Round } from "@/domain/entities/round.entity";
import { calculateCurrentMultiplierBps } from "@/domain/services/multiplier-calculator";
import {
  GameEventsPublisher,
  NOOP_GAME_EVENTS_PUBLISHER,
} from "../events/game-events.publisher";

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
    private readonly gameEventsPublisher: GameEventsPublisher = NOOP_GAME_EVENTS_PUBLISHER,
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
    const output = {
      cashedOut: true as const,
      betId: savedBet.id,
      playerId: savedBet.playerId,
      roundId: savedBet.roundId,
      amountCents: savedBet.amountCents.toString(),
      cashoutMultiplierBps: savedBet.getCashoutMultiplierBps() ?? cashoutMultiplierBps,
      payoutCents: (savedBet.getPayoutCents() ?? payoutCents).toString(),
      walletTransactionId: response.transaction.id,
      walletBalanceAfterCents: response.transaction.balanceAfterCents,
    };

    this.gameEventsPublisher.publish({
      name: "bet.cashed_out",
      payload: {
        betId: output.betId,
        playerId: output.playerId,
        roundId: output.roundId,
        cashoutMultiplierBps: output.cashoutMultiplierBps,
        payoutCents: output.payoutCents,
      },
    });

    return output;
  }

  private calculateCurrentMultiplierBps(round: Round, now: Date): number {
    const runningStartedAt = round.getRunningStartedAt();

    if (!runningStartedAt) {
      throw new Error("Running round is missing running start timestamp");
    }

    const multiplierBps = calculateCurrentMultiplierBps(runningStartedAt, now);
    const effectiveCrashMultiplierBps = Math.min(
      round.crashMultiplierBps,
      Number(process.env.GAMES_MAX_CRASH_MULTIPLIER_BPS ?? 500),
    );

    if (multiplierBps >= effectiveCrashMultiplierBps) {
      throw new Error("Round has already reached the crash multiplier");
    }

    return multiplierBps;
  }
}
