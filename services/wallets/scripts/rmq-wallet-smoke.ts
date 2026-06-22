import "reflect-metadata";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  WALLET_MESSAGE_PATTERNS,
  type WalletCreditCashoutRequest,
  type WalletDebitBetRequest,
  type WalletOperationResponse,
} from "@crash/contracts";

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

async function main(): Promise<void> {
  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672";
  const walletQueue = process.env.WALLET_RMQ_QUEUE ?? "wallets.operations";

  const client = ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: walletQueue,
      queueOptions: {
        durable: true,
      },
    },
  });

  await client.connect();

  const operationSuffix = Date.now();

  const creditMessage: WalletCreditCashoutRequest = {
    playerId: "player-rmq-1",
    operationId: `operation-rmq-credit-${operationSuffix}`,
    amountCents: "1000",
    referenceRoundId: "round-rmq-1",
    referenceBetId: "bet-rmq-1",
  };

  const creditResponse = await firstValueFrom(
    client.send<WalletOperationResponse, WalletCreditCashoutRequest>(
      WALLET_MESSAGE_PATTERNS.CREDIT_CASHOUT,
      creditMessage,
    ),
  );

  console.log("credit-cashout response");
  console.log(JSON.stringify(creditResponse, null, 2));

  const debitMessage: WalletDebitBetRequest = {
    playerId: "player-rmq-1",
    operationId: `operation-rmq-debit-${operationSuffix}`,
    amountCents: "250",
    referenceRoundId: "round-rmq-1",
    referenceBetId: "bet-rmq-1",
  };

  const debitResponse = await firstValueFrom(
    client.send<WalletOperationResponse, WalletDebitBetRequest>(
      WALLET_MESSAGE_PATTERNS.DEBIT_BET,
      debitMessage,
    ),
  );

  console.log("debit-bet response");
  console.log(JSON.stringify(debitResponse, null, 2));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
