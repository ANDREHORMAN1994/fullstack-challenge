import { Module } from "@nestjs/common";
import { MessagingModule } from "@/infrastructure/messaging/messaging.module";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { CreateRoundUseCase } from "./use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "./use-cases/get-current-round.use-case";

@Module({
  imports: [MessagingModule, DatabaseModule],
  providers: [PlaceBetUseCase, CreateRoundUseCase, GetCurrentRoundUseCase],
  exports: [PlaceBetUseCase, CreateRoundUseCase, GetCurrentRoundUseCase],
})
export class ApplicationModule {}
