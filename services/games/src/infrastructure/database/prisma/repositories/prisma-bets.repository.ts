import { Injectable } from "@nestjs/common";
import {
  BetsRepository,
  type ListBetsByPlayerInput,
} from "@/application/repositories/bet.repository";
import { Bet } from "@/domain/entities/bet.entity";
import { BetPrismaMapper } from "../mappers/bet-prisma.mapper";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PrismaBetsRepository extends BetsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(bet: Bet): Promise<Bet> {
    const data = BetPrismaMapper.toPersistence(bet);

    const savedBet = await this.prisma.bet.upsert({
      where: { id: bet.id },
      create: data,
      update: data,
    });

    return BetPrismaMapper.toDomain(savedBet);
  }

  async findManyByRoundId(roundId: string): Promise<Bet[]> {
    const bets = await this.prisma.bet.findMany({
      where: { roundId },
      orderBy: { createdAt: "asc" },
    });

    return bets.map(BetPrismaMapper.toDomain);
  }

  async findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null> {
    const bet = await this.prisma.bet.findUnique({
      where: {
        roundId_playerId: {
          roundId,
          playerId,
        },
      },
    });

    if (!bet) return null;

    return BetPrismaMapper.toDomain(bet);
  }

  async findManyByPlayerId(input: ListBetsByPlayerInput): Promise<Bet[]> {
    const bets = await this.prisma.bet.findMany({
      where: { playerId: input.playerId },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
    });

    return bets.map(BetPrismaMapper.toDomain);
  }
}
