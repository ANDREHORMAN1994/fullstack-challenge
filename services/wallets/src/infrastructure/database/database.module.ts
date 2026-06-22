import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { PrismaWalletsRepository } from "./prisma/repositories/prisma-wallets.repository";
import { WalletsRepository } from "@/application/repositories/wallets.repository";

@Module({
  providers: [
    PrismaService,
    {
      provide: WalletsRepository,
      useClass: PrismaWalletsRepository,
    },
  ],
  exports: [WalletsRepository],
})
export class DatabaseModule {}
