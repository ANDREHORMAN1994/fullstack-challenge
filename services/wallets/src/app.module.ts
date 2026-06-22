import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { ApplicationModule } from "./application/application.module";

@Module({
  imports: [ApplicationModule],
  controllers: [WalletsController],
})
export class AppModule {}
