import { PlaceBetOutput } from "@/application/use-cases/place-bet.use-case";

export class PlaceBetResponseDto {
  accepted!: boolean;
  betId!: string;
  playerId!: string;
  roundId!: string;
  amountCents!: string;
  walletTransactionId!: string;
  walletBalanceAfterCents!: string;

  constructor(response: PlaceBetOutput) {
    this.accepted = response.accepted;
    this.betId = response.betId;
    this.playerId = response.playerId;
    this.roundId = response.roundId;
    this.amountCents = response.amountCents;
    this.walletTransactionId = response.walletTransactionId;
    this.walletBalanceAfterCents = response.walletBalanceAfterCents;
  }
}
