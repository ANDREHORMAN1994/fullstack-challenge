import {
  Body,
  ConflictException,
  NotFoundException,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { HealthCheckResponseDto } from "@/presentation/dtos/health-check-response.dto";
import { CreateWalletRequestDto } from "@/presentation/dtos/create-wallet-request.dto";
import { WalletResponseDto } from "@/presentation/dtos/wallet-response.dto";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return new HealthCheckResponseDto({ status: "ok", service: "wallets" });
  }

  @Post("wallets")
  async createWallet(@Body() body: CreateWalletRequestDto) {
    try {
      const wallet = await this.createWalletUseCase.execute({
        playerId: body.playerId,
        currency: body.currency,
      });
      return new WalletResponseDto(wallet);
    } catch (error) {
      if (error instanceof Error && error.message === "Wallet already exists for this player") {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Get("wallets/:playerId")
  async findWalletById(@Param("playerId") playerId: string) {
    try {
      const wallet = await this.getWalletUseCase.execute({ playerId });
      return new WalletResponseDto(wallet);
    } catch (error) {
      if (error instanceof Error && error.message === "Wallet not found") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
