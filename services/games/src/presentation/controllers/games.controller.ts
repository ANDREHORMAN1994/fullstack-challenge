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

@Controller()
export class GamesController {
  constructor(
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly createRoundUseCase: CreateRoundUseCase,
    private readonly getCurrentRoundUseCase: GetCurrentRoundUseCase,
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

  @Post("games/bets")
  async placeBetRequest(@Body() body: PlaceBetRequestDto) {
    try {
      const response = await this.placeBetUseCase.execute({
        betId: body.betId,
        amountCents: body.amountCents,
        playerId: body.playerId,
        roundId: body.roundId,
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
          "Bet round does not match current round",
          "Player already placed a bet in this round",
        ].includes(error.message)
      ) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
