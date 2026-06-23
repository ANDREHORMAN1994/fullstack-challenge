import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { GamesController } from "@/presentation/controllers/games.controller";
import { PlaceBetUseCase, type PlaceBetInput } from "@/application/use-cases/place-bet.use-case";

class FakePlaceBetUseCase {
  calls: PlaceBetInput[] = [];
  errorMessage?: string;

  async execute(input: PlaceBetInput) {
    this.calls.push(input);

    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      accepted: true,
      betId: input.betId,
      playerId: input.playerId,
      roundId: input.roundId,
      amountCents: input.amountCents,
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "750",
    };
  }
}

@Module({
  controllers: [GamesController],
  providers: [
    {
      provide: PlaceBetUseCase,
      useClass: FakePlaceBetUseCase,
    },
  ],
})
class TestAppModule {}

describe("GamesController E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let placeBetUseCase: FakePlaceBetUseCase;

  beforeAll(async () => {
    app = await NestFactory.create(TestAppModule, { logger: false });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.listen(0);

    const address = app.getHttpServer().address();

    if (typeof address === "string" || address === null) {
      throw new Error("Could not resolve test server address");
    }

    baseUrl = `http://localhost:${address.port}`;
    placeBetUseCase = app.get(PlaceBetUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health - check service is on", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "games",
    });
  });

  it("POST /games/bets - places a bet", async () => {
    const response = await fetch(`${baseUrl}/games/bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "250",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      accepted: true,
      betId: "bet-1",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: "250",
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "750",
    });
    expect(placeBetUseCase.calls[placeBetUseCase.calls.length - 1]).toEqual({
      playerId: "player-1",
      roundId: "round-1",
      betId: "bet-1",
      amountCents: "250",
    });
  });

  it("POST /games/bets - rejects invalid payloads", async () => {
    const response = await fetch(`${baseUrl}/games/bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        roundId: "",
        betId: "bet-1",
        amountCents: "0",
        unexpected: "not-allowed",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("property unexpected should not exist");
    expect(body.message).toContain("roundId should not be empty");
    expect(body.message).toContain("amountCents must be a positive integer string");
  });

  it("POST /games/bets - maps wallet debit failures to 422", async () => {
    placeBetUseCase.errorMessage = "Wallet debit failed: INSUFFICIENT_BALANCE";

    const response = await fetch(`${baseUrl}/games/bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "999999",
      }),
    });

    placeBetUseCase.errorMessage = undefined;

    expect(response.status).toBe(422);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 422);
    expect(body).toHaveProperty("error", "Unprocessable Entity");
    expect(body).toHaveProperty("message", "Wallet debit failed: INSUFFICIENT_BALANCE");
  });

  it("POST /games/bets - maps game rule failures to 409", async () => {
    placeBetUseCase.errorMessage = "Round is not accepting bets";

    const response = await fetch(`${baseUrl}/games/bets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "250",
      }),
    });

    placeBetUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("error", "Conflict");
    expect(body).toHaveProperty("message", "Round is not accepting bets");
  });
});
