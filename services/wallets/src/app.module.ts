import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { DatabaseModule } from "./infrastructure/database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [WalletsController],
})
export class AppModule {}
