import { Injectable } from "@nestjs/common";
import {
  type ListRoundsHistoryInput,
  RoundsRepository,
} from "@/application/repositories/rounds.repository";
import { Round } from "@/domain/entities/round.entity";
import { RoundPrismaMapper } from "../mappers/round-prisma.mapper";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PrismaRoundsRepository extends RoundsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(round: Round): Promise<Round> {
    const data = RoundPrismaMapper.toPersistence(round);

    const savedRound = await this.prisma.round.upsert({
      where: { id: round.id },
      create: data,
      update: data,
    });

    return RoundPrismaMapper.toDomain(savedRound);
  }

  async findById(id: string): Promise<Round | null> {
    const round = await this.prisma.round.findUnique({
      where: { id },
    });

    if (!round) return null;

    return RoundPrismaMapper.toDomain(round);
  }

  async findCurrent(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: ["BETTING", "RUNNING", "CRASHED"],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!round) return null;

    return RoundPrismaMapper.toDomain(round);
  }

  async findHistory(input: ListRoundsHistoryInput): Promise<Round[]> {
    const rounds = await this.prisma.round.findMany({
      where: {
        status: {
          in: ["CRASHED", "SETTLED"],
        },
      },
      orderBy: { crashedAt: "desc" },
      take: input.limit,
      skip: input.offset,
    });

    return rounds.map(RoundPrismaMapper.toDomain);
  }
}
