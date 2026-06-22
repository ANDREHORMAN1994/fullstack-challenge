import { Module } from "@nestjs/common";
import { Clock } from "@/application/providers/clock";
import { IdGenerator } from "@/application/providers/id-generator";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { DebitBetUseCase } from "@/application/use-cases/debit-bet.use-case";
import { CreditCashoutUseCase } from "@/application/use-cases/credit-cashout.use-case";
import { DatabaseModule } from "@/infrastructure/database/database.module";
import { SystemClock } from "@/infrastructure/providers/system-clock";
import { CryptoIdGenerator } from "@/infrastructure/providers/crypto-id-generator";

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: Clock,
      useClass: SystemClock,
    },
    {
      provide: IdGenerator,
      useClass: CryptoIdGenerator,
    },
    CreateWalletUseCase,
    GetWalletUseCase,
    DebitBetUseCase,
    CreditCashoutUseCase,
  ],
  exports: [CreateWalletUseCase, GetWalletUseCase, DebitBetUseCase, CreditCashoutUseCase],
})
export class ApplicationModule {}
