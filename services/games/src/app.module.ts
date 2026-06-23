import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { ApplicationModule } from "./application/application.module";
import { GameEventsGateway } from "./presentation/gateways/game-events.gateway";
import { JwtAuthGuard } from "./presentation/auth/jwt-auth.guard";

@Module({
  imports: [ApplicationModule],
  controllers: [GamesController],
  providers: [GameEventsGateway, JwtAuthGuard],
})
export class AppModule {}
