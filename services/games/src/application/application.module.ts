import { Module } from "@nestjs/common";
import { MessagingModule } from "@/infrastructure/messaging/messaging.module";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { CreateRoundUseCase } from "./use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "./use-cases/get-current-round.use-case";
import { CashoutBetUseCase } from "./use-cases/cashout-bet.use-case";
import { StartCurrentRoundUseCase } from "./use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "./use-cases/crash-current-round.use-case";
import { SettleCurrentRoundUseCase } from "./use-cases/settle-current-round.use-case";
import { AutomaticRoundEngineService } from "./services/automatic-round-engine.service";
import { GameEventsPublisher } from "./events/game-events.publisher";
import { SocketioGameEventsPublisher } from "@/infrastructure/realtime/socketio-game-events.publisher";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";
import { GetRoundVerificationUseCase } from "./use-cases/get-round-verification.use-case";
import { GetRoundsHistoryUseCase } from "./use-cases/get-rounds-history.use-case";
import { GetMyBetsHistoryUseCase } from "./use-cases/get-my-bets-history.use-case";

@Module({
  imports: [MessagingModule, DatabaseModule],
  providers: [
    PlaceBetUseCase,
    CreateRoundUseCase,
    GetCurrentRoundUseCase,
    CashoutBetUseCase,
    StartCurrentRoundUseCase,
    CrashCurrentRoundUseCase,
    SettleCurrentRoundUseCase,
    GetRoundVerificationUseCase,
    GetRoundsHistoryUseCase,
    GetMyBetsHistoryUseCase,
    AutomaticRoundEngineService,
    ProvablyFairService,
    SocketioGameEventsPublisher,
    {
      provide: GameEventsPublisher,
      useExisting: SocketioGameEventsPublisher,
    },
  ],
  exports: [
    PlaceBetUseCase,
    CreateRoundUseCase,
    GetCurrentRoundUseCase,
    CashoutBetUseCase,
    StartCurrentRoundUseCase,
    CrashCurrentRoundUseCase,
    SettleCurrentRoundUseCase,
    GetRoundVerificationUseCase,
    GetRoundsHistoryUseCase,
    GetMyBetsHistoryUseCase,
    AutomaticRoundEngineService,
    ProvablyFairService,
    SocketioGameEventsPublisher,
    GameEventsPublisher,
  ],
})
export class ApplicationModule {}
