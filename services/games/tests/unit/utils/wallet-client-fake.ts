import { WalletClient } from "@/application/clients/wallet.client";
import { BetsRepository } from "@/application/repositories/bet.repository";
import { RoundsRepository } from "@/application/repositories/rounds.repository";
import { Bet } from "@/domain/entities/bet.entity";
import { Round } from "@/domain/entities/round.entity";
import {
  WalletCreditCashoutRequest,
  WalletDebitBetRequest,
  WalletOperationResponse,
} from "@crash/contracts";

export class FakeWalletClient extends WalletClient {
  debitBetCalls: WalletDebitBetRequest[] = [];
  creditCashoutCalls: WalletCreditCashoutRequest[] = [];

  constructor(
    private debitBetResponse: WalletOperationResponse,
    private creditCashoutResponse?: WalletOperationResponse,
  ) {
    super();
  }

  async debitBet(input: WalletDebitBetRequest): Promise<WalletOperationResponse> {
    this.debitBetCalls.push(input);
    return this.debitBetResponse;
  }

  async creditCashout(input: WalletCreditCashoutRequest): Promise<WalletOperationResponse> {
    this.creditCashoutCalls.push(input);

    if (!this.creditCashoutResponse) {
      throw new Error("creditCashout should not be called");
    }

    return this.creditCashoutResponse;
  }
}

export class FakeBetRepository extends BetsRepository {
  private bets: Bet[] = [];

  async create(bet: Bet): Promise<Bet> {
    const betIndex = this.bets.findIndex((storedBet) => storedBet.id === bet.id);

    if (betIndex >= 0) {
      this.bets[betIndex] = bet;
      return bet;
    }

    this.bets.push(bet);
    return bet;
  }

  async findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null> {
    return this.bets.find((bet) => bet.roundId === roundId && bet.playerId === playerId) ?? null;
  }

  async findManyByRoundId(roundId: string): Promise<Bet[]> {
    return this.bets.filter((bet) => bet.roundId === roundId) ?? [];
  }

  getBets() {
    return this.bets;
  }
}

export class FakeRoundsRepository extends RoundsRepository {
  private rounds: Round[] = [];

  constructor(currentRound?: Round | null) {
    super();

    if (currentRound) {
      this.rounds.push(currentRound);
    }
  }

  async save(round: Round): Promise<Round> {
    const roundIndex = this.rounds.findIndex((storedRound) => storedRound.id === round.id);

    if (roundIndex >= 0) {
      this.rounds[roundIndex] = round;
      return round;
    }

    this.rounds.push(round);
    return round;
  }

  async findById(id: string): Promise<Round | null> {
    return this.rounds.find((round) => round.id === id) ?? null;
  }

  async findCurrent(): Promise<Round | null> {
    return (
      [...this.rounds]
        .filter((round) => round.getStatus() !== "SETTLED")
        .sort((left, right) => right.getCreatedAt().getTime() - left.getCreatedAt().getTime())[0] ??
      null
    );
  }
}
