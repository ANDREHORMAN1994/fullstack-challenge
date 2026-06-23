import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from "@nestjs/common";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { PlaceBetResponseDto } from "../dtos/place-bet-response.dto";
import { CreateRoundUseCase } from "@/application/use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "@/application/use-cases/get-current-round.use-case";
import { CreateRoundRequestDto } from "../dtos/create-round-request.dto";
import { RoundResponseDto } from "../dtos/round-response.dto";
import { CashoutBetRequestDto } from "../dtos/cashout-bet-request.dto";
import { CashoutBetUseCase } from "@/application/use-cases/cashout-bet.use-case";
import { CashoutBetResponseDto } from "../dtos/cashout-bet-response.dto";
import { StartCurrentRoundUseCase } from "@/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "@/application/use-cases/crash-current-round.use-case";
import { SettleCurrentRoundUseCase } from "@/application/use-cases/settle-current-round.use-case";
import { SettleCurrentRoundResponseDto } from "../dtos/settle-current-round-response.dto";

@Controller()
export class GamesController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashoutBetUseCase: CashoutBetUseCase,
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
    private readonly startCurrentRoundUseCase: StartCurrentRoundUseCase,
    private readonly crashCurrentRoundUseCase: CrashCurrentRoundUseCase,
    private readonly settleCurrentRoundUseCase: SettleCurrentRoundUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return new HealthCheckResponseDto({ status: "ok", service: "games" });
  }

  @Get("games/rounds/current")
  async getCurrentRound(): Promise<RoundResponseDto> {
    const round = await this.getCurrentRoundUseCase.execute();

    if (!round) {
      throw new NotFoundException("No active round");
    }

    return new RoundResponseDto(round);
  }

  @Post("games/rounds")
  async createRound(@Body() body: CreateRoundRequestDto): Promise<RoundResponseDto> {
    try {
      const round = await this.createRoundUseCase.execute({
        roundId: body.roundId,
        crashMultiplierBps: body.crashMultiplierBps,
      });

      return new RoundResponseDto(round);
    } catch (error) {
      if (error instanceof Error && error.message === "There is already an active round") {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post("games/rounds/current/start")
  async startCurrentRound(): Promise<RoundResponseDto> {
    try {
      const round = await this.startCurrentRoundUseCase.execute();

      return new RoundResponseDto(round);
    } catch (error) {
      if (
        error instanceof Error &&
        ["No active round", "Only betting rounds can start running"].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post("games/rounds/current/crash")
  async crashCurrentRound(): Promise<RoundResponseDto> {
    try {
      const round = await this.crashCurrentRoundUseCase.execute();

      return new RoundResponseDto(round);
    } catch (error) {
      if (
        error instanceof Error &&
        ["No active round", "Only running rounds can crash"].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post("games/rounds/current/settle")
  async settleCurrentRound(): Promise<SettleCurrentRoundResponseDto> {
    try {
      const response = await this.settleCurrentRoundUseCase.execute();

      return new SettleCurrentRoundResponseDto(response);
    } catch (error) {
      if (
        error instanceof Error &&
        ["No active round", "Only crashed rounds can be settled"].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post("games/bet")
  async placeBet(@Body() body: PlaceBetRequestDto) {
    try {
      const response = await this.placeBetUseCase.execute({
        betId: body.betId,
        amountCents: body.amountCents,
        playerId: body.playerId,
      });
      return new PlaceBetResponseDto(response);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Wallet debit failed")) {
        throw new UnprocessableEntityException(error.message);
      }

      if (
        error instanceof Error &&
        [
          "No active round",
          "Round is not accepting bets",
          "Player already placed a bet in this round",
        ].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Post("games/bet/cashout")
  async cashoutBet(@Body() body: CashoutBetRequestDto) {
    try {
      const response = await this.cashoutBetUseCase.execute({
        playerId: body.playerId,
      });

      return new CashoutBetResponseDto(response);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Wallet cashout credit failed")) {
        throw new UnprocessableEntityException(error.message);
      }

      if (
        error instanceof Error &&
        [
          "No active round",
          "Round is not accepting cashouts",
          "Player has no bet in current round",
          "Only placed bets can be cashed out",
          "Round has already reached the crash multiplier",
        ].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
