import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { ApplicationModule } from "./application/application.module";
import { WalletsMessageController } from "./presentation/messaging/wallets-message.controller";
import { JwtAuthGuard } from "./presentation/auth/jwt-auth.guard";

@Module({
  imports: [ApplicationModule],
  controllers: [WalletsController, WalletsMessageController],
  providers: [JwtAuthGuard],
})
export class AppModule {}
