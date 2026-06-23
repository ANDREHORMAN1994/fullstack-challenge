import { Module } from "@nestjs/common";
import { BetsRepository } from "@/application/repositories/bet.repository";
import { RoundsRepository } from "@/application/repositories/rounds.repository";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaBetsRepository } from "./prisma/repositories/prisma-bets.repository";
import { PrismaRoundsRepository } from "./prisma/repositories/prisma-rounds.repository";

@Module({
  providers: [
    PrismaService,
    {
      provide: BetsRepository,
      useClass: PrismaBetsRepository,
    },
    {
      provide: RoundsRepository,
      useClass: PrismaRoundsRepository,
    },
  ],
  exports: [BetsRepository, RoundsRepository],
})
export class DatabaseModule {}
