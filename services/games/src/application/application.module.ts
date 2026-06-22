import { Module } from "@nestjs/common";
import { MessagingModule } from "@/infrastructure/messaging/messaging.module";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";

@Module({
  imports: [MessagingModule],
  providers: [PlaceBetUseCase],
  exports: [PlaceBetUseCase],
})
export class ApplicationModule {}
