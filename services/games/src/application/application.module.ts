import { Module } from "@nestjs/common";
import { MessagingModule } from "@/infrastructure/messaging/messaging.module";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { DatabaseModule } from "@/infrastructure/database/database.module";

@Module({
  imports: [MessagingModule, DatabaseModule],
  providers: [PlaceBetUseCase],
  exports: [PlaceBetUseCase],
})
export class ApplicationModule {}
