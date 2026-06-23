import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { RoundsRepository } from "../repositories/rounds.repository";
import { CreateRoundUseCase } from "../use-cases/create-round.use-case";
import { StartCurrentRoundUseCase } from "../use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "../use-cases/crash-current-round.use-case";
import { SettleCurrentRoundUseCase } from "../use-cases/settle-current-round.use-case";
import { calculateCurrentMultiplierBps } from "@/domain/services/multiplier-calculator";

export type AutomaticRoundEngineConfig = {
  enabled: boolean;
  tickIntervalMs: number;
  bettingWindowMs: number;
  settlementDelayMs: number;
  minCrashMultiplierBps: number;
  maxCrashMultiplierBps: number;
};

export const getAutomaticRoundEngineConfig = (): AutomaticRoundEngineConfig => ({
  enabled: process.env.GAMES_ENGINE_ENABLED === "true",
  tickIntervalMs: Number(process.env.GAMES_ENGINE_TICK_INTERVAL_MS ?? 500),
  bettingWindowMs: Number(process.env.GAMES_BETTING_WINDOW_MS ?? 10_000),
  settlementDelayMs: Number(process.env.GAMES_SETTLEMENT_DELAY_MS ?? 2_000),
  minCrashMultiplierBps: Number(process.env.GAMES_MIN_CRASH_MULTIPLIER_BPS ?? 120),
  maxCrashMultiplierBps: Number(process.env.GAMES_MAX_CRASH_MULTIPLIER_BPS ?? 1_000),
});

@Injectable()
export class AutomaticRoundEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomaticRoundEngineService.name);
  private readonly config: AutomaticRoundEngineConfig;
  private interval?: ReturnType<typeof setInterval>;
  private isTicking = false;

  constructor(
    private readonly roundsRepository: RoundsRepository,
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly startCurrentRoundUseCase: StartCurrentRoundUseCase,
    private readonly crashCurrentRoundUseCase: CrashCurrentRoundUseCase,
    private readonly settleCurrentRoundUseCase: SettleCurrentRoundUseCase,
  ) {
    this.config = getAutomaticRoundEngineConfig();
  }

  onModuleInit(): void {
    if (!this.config.enabled) {
      return;
    }

    this.interval = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error("Automatic round engine tick failed", error);
      });
    }, this.config.tickIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async tick(now = new Date()): Promise<void> {
    if (this.isTicking) {
      return;
    }

    this.isTicking = true;

    try {
      await this.runTick(now);
    } finally {
      this.isTicking = false;
    }
  }

  private async runTick(now: Date): Promise<void> {
    const currentRound = await this.roundsRepository.findCurrent();

    if (!currentRound) {
      await this.createRoundUseCase.execute({
        roundId: this.createRoundId(now),
        crashMultiplierBps: this.generateCrashMultiplierBps(),
      });
      return;
    }

    const status = currentRound.getStatus();

    if (status === "BETTING") {
      const elapsedMs = now.getTime() - currentRound.getBettingStartedAt().getTime();

      if (elapsedMs >= this.config.bettingWindowMs) {
        await this.startCurrentRoundUseCase.execute(now);
      }

      return;
    }

    if (status === "RUNNING") {
      const runningStartedAt = currentRound.getRunningStartedAt();

      if (!runningStartedAt) {
        throw new Error("Running round is missing running start timestamp");
      }

      const multiplierBps = calculateCurrentMultiplierBps(runningStartedAt, now);

      if (multiplierBps >= currentRound.crashMultiplierBps) {
        await this.crashCurrentRoundUseCase.execute(now);
      }

      return;
    }

    if (status === "CRASHED") {
      const crashedAt = currentRound.getCrashedAt();

      if (!crashedAt) {
        throw new Error("Crashed round is missing crash timestamp");
      }

      const elapsedMs = now.getTime() - crashedAt.getTime();

      if (elapsedMs >= this.config.settlementDelayMs) {
        await this.settleCurrentRoundUseCase.execute(now);
      }
    }
  }

  private createRoundId(now: Date): string {
    return `round-${now.getTime()}-${globalThis.crypto.randomUUID()}`;
  }

  private generateCrashMultiplierBps(): number {
    const min = this.config.minCrashMultiplierBps;
    const max = this.config.maxCrashMultiplierBps;
    const randomValue = globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;

    return min + (randomValue % (max - min + 1));
  }
}
