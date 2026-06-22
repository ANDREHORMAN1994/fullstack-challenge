import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { ApplicationModule } from "./application/application.module";

@Module({
  imports: [ApplicationModule],
  controllers: [GamesController],
})
export class AppModule {}
