import { Body, Controller, Get, Post, UnprocessableEntityException } from "@nestjs/common";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";
import { PlaceBetUseCase } from "@/application/use-cases/place-bet.use-case";
import { PlaceBetResponseDto } from "../dtos/place-bet-response.dto";

@Controller()
export class GamesController {
  constructor(private readonly placeBetUseCase: PlaceBetUseCase) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return new HealthCheckResponseDto({ status: "ok", service: "games" });
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

      throw error;
    }
  }
}
