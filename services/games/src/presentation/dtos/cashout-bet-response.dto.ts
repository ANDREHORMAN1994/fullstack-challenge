import { CashoutBetOutput } from "@/application/use-cases/cashout-bet.use-case";

export class CashoutBetResponseDto {
  cashedOut!: boolean;
  betId!: string;
  playerId!: string;
  roundId!: string;
  amountCents!: string;
  cashoutMultiplierBps!: number;
  payoutCents!: string;
  walletTransactionId!: string;
  walletBalanceAfterCents!: string;

  constructor(response: CashoutBetOutput) {
    this.cashedOut = response.cashedOut;
    this.betId = response.betId;
    this.playerId = response.playerId;
    this.roundId = response.roundId;
    this.amountCents = response.amountCents;
    this.cashoutMultiplierBps = response.cashoutMultiplierBps;
    this.payoutCents = response.payoutCents;
    this.walletTransactionId = response.walletTransactionId;
    this.walletBalanceAfterCents = response.walletBalanceAfterCents;
  }
}
