import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
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
import { GetRoundVerificationUseCase } from "@/application/use-cases/get-round-verification.use-case";
import { RoundVerificationResponseDto } from "../dtos/round-verification-response.dto";
import { GetRoundsHistoryUseCase } from "@/application/use-cases/get-rounds-history.use-case";
import { GetMyBetsHistoryUseCase } from "@/application/use-cases/get-my-bets-history.use-case";
import { PaginationQueryDto } from "../dtos/pagination-query.dto";
import { RoundsHistoryResponseDto } from "../dtos/rounds-history-response.dto";
import { MyBetsHistoryQueryDto } from "../dtos/my-bets-history-query.dto";
import { MyBetsHistoryResponseDto } from "../dtos/my-bets-history-response.dto";
import {
  AuthenticatedPlayer,
  type AuthenticatedPlayer as AuthenticatedPlayerPayload,
} from "../auth/authenticated-player.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

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
    private readonly getRoundVerificationUseCase: GetRoundVerificationUseCase,
    private readonly getRoundsHistoryUseCase: GetRoundsHistoryUseCase,
    private readonly getMyBetsHistoryUseCase: GetMyBetsHistoryUseCase,
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

  @Get("games/rounds/history")
  async getRoundsHistory(
    @Query() query: PaginationQueryDto,
  ): Promise<RoundsHistoryResponseDto> {
    const history = await this.getRoundsHistoryUseCase.execute({
      page: query.page,
      limit: query.limit,
    });

    return new RoundsHistoryResponseDto(history);
  }

  @Get("games/bets/me")
  @UseGuards(JwtAuthGuard)
  async getMyBetsHistory(
    @Query() query: MyBetsHistoryQueryDto,
    @AuthenticatedPlayer() player: AuthenticatedPlayerPayload,
  ): Promise<MyBetsHistoryResponseDto> {
    const history = await this.getMyBetsHistoryUseCase.execute({
      playerId: player.playerId,
      page: query.page,
      limit: query.limit,
    });

    return new MyBetsHistoryResponseDto(history);
  }

  @Post("games/rounds")
  async createRound(@Body() body: CreateRoundRequestDto): Promise<RoundResponseDto> {
    try {
      const round = await this.createRoundUseCase.execute({
        roundId: body.roundId,
        serverSeed: body.serverSeed,
        clientSeed: body.clientSeed,
        nonce: body.nonce,
      });

      return new RoundResponseDto(round);
    } catch (error) {
      if (error instanceof Error && error.message === "There is already an active round") {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  @Get("games/rounds/:roundId/verify")
  async getRoundVerification(
    @Param("roundId") roundId: string,
  ): Promise<RoundVerificationResponseDto> {
    try {
      const verification = await this.getRoundVerificationUseCase.execute(roundId);

      return new RoundVerificationResponseDto(verification);
    } catch (error) {
      if (error instanceof Error && error.message === "Round not found") {
        throw new NotFoundException(error.message);
      }

      if (
        error instanceof Error &&
        error.message === "Round verification is only available after crash"
      ) {
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
  @UseGuards(JwtAuthGuard)
  async placeBet(
    @Body() body: PlaceBetRequestDto,
    @AuthenticatedPlayer() player: AuthenticatedPlayerPayload,
  ) {
    try {
      const response = await this.placeBetUseCase.execute({
        betId: body.betId,
        amountCents: body.amountCents,
        playerId: player.playerId,
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
  @UseGuards(JwtAuthGuard)
  async cashoutBet(
    @Body() _body: CashoutBetRequestDto,
    @AuthenticatedPlayer() player: AuthenticatedPlayerPayload,
  ) {
    try {
      const response = await this.cashoutBetUseCase.execute({
        playerId: player.playerId,
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
