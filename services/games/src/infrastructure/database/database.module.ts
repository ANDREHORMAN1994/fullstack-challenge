import { Module } from "@nestjs/common";
import { BetsRepository } from "@/application/repositories/bet.repository";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaBetsRepository } from "./prisma/repositories/prisma-bets.repository";

@Module({
  providers: [
    PrismaService,
    {
      provide: BetsRepository,
      useClass: PrismaBetsRepository,
    },
  ],
  exports: [BetsRepository],
})
export class DatabaseModule {}
