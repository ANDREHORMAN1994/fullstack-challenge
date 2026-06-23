import { Injectable } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import {
  type PaginationInput,
  type PaginationOutput,
  normalizePagination,
} from "./pagination";

export type RoundHistoryItemOutput = {
  roundId: string;
  status: string;
  crashMultiplierBps: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  bettingStartedAt: string;
  runningStartedAt?: string;
  crashedAt: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GetRoundsHistoryOutput = {
  items: RoundHistoryItemOutput[];
  pagination: PaginationOutput;
};

@Injectable()
export class GetRoundsHistoryUseCase {
  constructor(private readonly roundsRepository: RoundsRepository) {}

  async execute(input: PaginationInput): Promise<GetRoundsHistoryOutput> {
    const pagination = normalizePagination(input);
    const rounds = await this.roundsRepository.findHistory({
      limit: pagination.limit + 1,
      offset: pagination.offset,
    });
    const pageItems = rounds.slice(0, pagination.limit);

    return {
      items: pageItems.map((round) => {
        const crashedAt = round.getCrashedAt();

        if (!crashedAt) {
          throw new Error("Historical rounds must have a crash timestamp");
        }

        return {
          roundId: round.id,
          status: round.getStatus(),
          crashMultiplierBps: round.crashMultiplierBps,
          serverSeedHash: round.serverSeedHash,
          clientSeed: round.clientSeed,
          nonce: round.nonce,
          bettingStartedAt: round.getBettingStartedAt().toISOString(),
          runningStartedAt: round.getRunningStartedAt()?.toISOString(),
          crashedAt: crashedAt.toISOString(),
          settledAt: round.getSettledAt()?.toISOString(),
          createdAt: round.getCreatedAt().toISOString(),
          updatedAt: round.getUpdatedAt().toISOString(),
        };
      }),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasNextPage: rounds.length > pagination.limit,
      },
    };
  }
}
