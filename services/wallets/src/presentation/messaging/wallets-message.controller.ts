import { Controller } from "@nestjs/common";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import {
  WALLET_MESSAGE_PATTERNS,
  type WalletCreditCashoutRequest,
  type WalletDebitBetRequest,
  type WalletOperationResponse,
} from "@crash/contracts";
import { DebitBetUseCase } from "@/application/use-cases/debit-bet.use-case";
import { CreditCashoutUseCase } from "@/application/use-cases/credit-cashout.use-case";
import { WalletTransactionResponseDto } from "@/presentation/dtos/wallet-transaction-response.dto";

@Controller()
export class WalletsMessageController {
  constructor(
    private readonly debitBetUseCase: DebitBetUseCase,
    private readonly creditCashoutUseCase: CreditCashoutUseCase,
  ) {}

  @MessagePattern(WALLET_MESSAGE_PATTERNS.debitBet)
  async debitBet(
    @Payload() message: WalletDebitBetRequest,
    @Ctx() context?: RmqContext,
  ): Promise<WalletOperationResponse> {
    try {
      const transaction = await this.debitBetUseCase.execute({
        playerId: message.playerId,
        operationId: message.operationId,
        amountCents: BigInt(message.amountCents),
        referenceRoundId: message.referenceRoundId,
        referenceBetId: message.referenceBetId,
      });

      return {
        ok: true,
        transaction: new WalletTransactionResponseDto(transaction),
      };
    } catch (error) {
      return this.mapError(error);
    } finally {
      this.ackMessage(context);
    }
  }

  @MessagePattern(WALLET_MESSAGE_PATTERNS.creditCashout)
  async creditCashout(
    @Payload() message: WalletCreditCashoutRequest,
    @Ctx() context?: RmqContext,
  ): Promise<WalletOperationResponse> {
    try {
      const transaction = await this.creditCashoutUseCase.execute({
        playerId: message.playerId,
        operationId: message.operationId,
        amountCents: BigInt(message.amountCents),
        referenceRoundId: message.referenceRoundId,
        referenceBetId: message.referenceBetId,
      });

      return {
        ok: true,
        transaction: new WalletTransactionResponseDto(transaction),
      };
    } catch (error) {
      return this.mapError(error);
    } finally {
      this.ackMessage(context);
    }
  }

  private ackMessage(context?: RmqContext): void {
    if (!context) {
      return;
    }

    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    channel.ack(originalMessage);
  }

  private mapError(error: unknown): WalletOperationResponse {
    if (error instanceof SyntaxError) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid wallet operation payload",
        },
      };
    }

    if (error instanceof Error) {
      if (error.message === "Wallet not found") {
        return {
          ok: false,
          error: {
            code: "WALLET_NOT_FOUND",
            message: error.message,
          },
        };
      }

      if (error.message === "Insufficient balance") {
        return {
          ok: false,
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: error.message,
          },
        };
      }
    }

    return {
      ok: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Unexpected wallet operation error",
      },
    };
  }
}
