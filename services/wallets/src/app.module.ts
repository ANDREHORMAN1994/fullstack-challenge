import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { ApplicationModule } from "./application/application.module";
import { WalletsMessageController } from "./presentation/messaging/wallets-message.controller";

@Module({
  imports: [ApplicationModule],
  controllers: [WalletsController, WalletsMessageController],
})
export class AppModule {}
