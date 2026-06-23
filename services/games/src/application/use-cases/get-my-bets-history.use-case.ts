import { Injectable } from "@nestjs/common";
import { BetsRepository } from "../repositories/bet.repository";
import {
  type PaginationInput,
  type PaginationOutput,
  normalizePagination,
} from "./pagination";

export type BetHistoryItemOutput = {
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  status: string;
  cashoutMultiplierBps?: number;
  payoutCents?: string;
  createdAt: string;
  updatedAt: string;
};

export type GetMyBetsHistoryInput = PaginationInput & {
  playerId: string;
};

export type GetMyBetsHistoryOutput = {
  items: BetHistoryItemOutput[];
  pagination: PaginationOutput;
};

@Injectable()
export class GetMyBetsHistoryUseCase {
  constructor(private readonly betsRepository: BetsRepository) {}

  async execute(input: GetMyBetsHistoryInput): Promise<GetMyBetsHistoryOutput> {
    const playerId = input.playerId.trim();

    if (!playerId) {
      throw new Error("Player ID cannot be empty");
    }

    const pagination = normalizePagination(input);
    const bets = await this.betsRepository.findManyByPlayerId({
      playerId,
      limit: pagination.limit + 1,
      offset: pagination.offset,
    });
    const pageItems = bets.slice(0, pagination.limit);

    return {
      items: pageItems.map((bet) => ({
        betId: bet.id,
        playerId: bet.playerId,
        roundId: bet.roundId,
        amountCents: bet.amountCents.toString(),
        status: bet.getStatus(),
        cashoutMultiplierBps: bet.getCashoutMultiplierBps(),
        payoutCents: bet.getPayoutCents()?.toString(),
        createdAt: bet.getCreatedAt().toISOString(),
        updatedAt: bet.getUpdatedAt().toISOString(),
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasNextPage: bets.length > pagination.limit,
      },
    };
  }
}
