import { Round } from "@/domain/entities/round.entity";

export type ListRoundsHistoryInput = {
  limit: number;
  offset: number;
};

export abstract class RoundsRepository {
  abstract save(round: Round): Promise<Round>;
  abstract findById(id: string): Promise<Round | null>;
  abstract findCurrent(): Promise<Round | null>;
  abstract findHistory(input: ListRoundsHistoryInput): Promise<Round[]>;
}
