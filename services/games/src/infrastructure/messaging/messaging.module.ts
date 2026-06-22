import { WalletClient } from "@/application/clients/wallet.client";
import { Module } from "@nestjs/common";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { RabbitmqWalletClient, WALLET_RMQ_CLIENT } from "./rabbitmq-wallet.client";

@Module({
  providers: [
    {
      provide: WALLET_RMQ_CLIENT,
      useFactory: () => {
        const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://admin:admin@localhost:5672";
        const walletQueue = process.env.WALLET_RMQ_QUEUE ?? "wallets.operations";

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [rabbitmqUrl],
            queue: walletQueue,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
    },
    {
      provide: WalletClient,
      useClass: RabbitmqWalletClient,
    },
  ],
  exports: [WalletClient],
})
export class MessagingModule {}
