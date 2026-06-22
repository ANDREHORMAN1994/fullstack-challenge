import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
  imports: [MessagingModule],
  controllers: [GamesController],
})
export class AppModule {}
