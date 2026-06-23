import {
  Body,
  ConflictException,
  NotFoundException,
  Controller,
  Get,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from "@nestjs/common";
import { HealthCheckResponseDto } from "@/presentation/dtos/health-check-response.dto";
import { CreateWalletRequestDto } from "@/presentation/dtos/create-wallet-request.dto";
import { WalletResponseDto } from "@/presentation/dtos/wallet-response.dto";
import { WalletTransactionRequestDto } from "@/presentation/dtos/wallet-transaction-request.dto";
import { WalletTransactionResponseDto } from "@/presentation/dtos/wallet-transaction-response.dto";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { DebitBetUseCase } from "@/application/use-cases/debit-bet.use-case";
import { CreditCashoutUseCase } from "@/application/use-cases/credit-cashout.use-case";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  AuthenticatedPlayer,
  type AuthenticatedPlayer as AuthenticatedPlayerPayload,
} from "../auth/authenticated-player.decorator";

@Controller()
export class WalletsController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly debitBetUseCase: DebitBetUseCase,
    private readonly creditCashoutUseCase: CreditCashoutUseCase,
  ) {}

  @Get("health")
  check(): HealthCheckResponseDto {
    return new HealthCheckResponseDto({ status: "ok", service: "wallets" });
  }

  @Post("wallets")
  @UseGuards(JwtAuthGuard)
  async createWallet(
    @Body() body: CreateWalletRequestDto,
    @AuthenticatedPlayer() player: AuthenticatedPlayerPayload,
  ) {
    try {
      const wallet = await this.createWalletUseCase.execute({
        playerId: player.playerId,
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

  @Get("wallets/me")
  @UseGuards(JwtAuthGuard)
  async findMyWallet(@AuthenticatedPlayer() player: AuthenticatedPlayerPayload) {
    try {
      const wallet = await this.getWalletUseCase.execute({ playerId: player.playerId });
      return new WalletResponseDto(wallet);
    } catch (error) {
      if (error instanceof Error && error.message === "Wallet not found") {
        throw new NotFoundException(error.message);
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

  @Post("wallets/debit-bet")
  async createTransactionDebitBet(@Body() body: WalletTransactionRequestDto) {
    try {
      const transaction = await this.debitBetUseCase.execute({
        playerId: body.playerId,
        operationId: body.operationId,
        amountCents: BigInt(body.amountCents),
        referenceRoundId: body.referenceRoundId,
        referenceBetId: body.referenceBetId,
      });

      return new WalletTransactionResponseDto(transaction);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Insufficient balance") {
          throw new UnprocessableEntityException(error.message);
        }

        if (error.message === "Wallet not found") {
          throw new NotFoundException(error.message);
        }
      }
      throw error;
    }
  }

  @Post("wallets/credit-cashout")
  async createTransactionCreditCashout(@Body() body: WalletTransactionRequestDto) {
    try {
      const transaction = await this.creditCashoutUseCase.execute({
        playerId: body.playerId,
        operationId: body.operationId,
        amountCents: BigInt(body.amountCents),
        referenceRoundId: body.referenceRoundId,
        referenceBetId: body.referenceBetId,
      });

      return new WalletTransactionResponseDto(transaction);
    } catch (error) {
      if (error instanceof Error && error.message === "Wallet not found") {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
