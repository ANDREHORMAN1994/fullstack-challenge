import { WalletClient } from "@/application/clients/wallet.client";
import { BetsRepository } from "@/application/repositories/bet.repository";
import { Bet } from "@/domain/entities/bet.entity";
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

export class FakeBetRepository extends BetsRepository {
  private bets: Bet[] = [];

  async create(bet: Bet): Promise<Bet> {
    const betIndex = this.bets.findIndex((storedBet) => storedBet.id === bet.id);

    if (betIndex >= 0) {
      this.bets[betIndex] = bet;
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
