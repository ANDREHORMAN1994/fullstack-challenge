import { Bet } from "@/domain/entities/bet.entity";

export type ListBetsByPlayerInput = {
  playerId: string;
  limit: number;
  offset: number;
};

export abstract class BetsRepository {
  abstract create(bet: Bet): Promise<Bet>;
  abstract findManyByRoundId(roundId: string): Promise<Bet[]>;
  abstract findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null>;
  abstract findManyByPlayerId(input: ListBetsByPlayerInput): Promise<Bet[]>;
}
