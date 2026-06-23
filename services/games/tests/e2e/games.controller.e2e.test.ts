import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { GamesController } from "@/presentation/controllers/games.controller";
import { PlaceBetUseCase, type PlaceBetInput } from "@/application/use-cases/place-bet.use-case";
import {
  CreateRoundUseCase,
  type CreateRoundInput,
  type RoundOutput,
} from "@/application/use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "@/application/use-cases/get-current-round.use-case";

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
      roundId: "round-1",
      amountCents: input.amountCents,
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "750",
    };
  }
}

const roundResponse: RoundOutput = {
  roundId: "round-1",
  status: "BETTING",
  crashMultiplierBps: 250,
  bettingStartedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

class FakeCreateRoundUseCase {
  calls: CreateRoundInput[] = [];
  errorMessage?: string;

  async execute(input: CreateRoundInput) {
    this.calls.push(input);

    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      ...roundResponse,
      roundId: input.roundId,
      crashMultiplierBps: input.crashMultiplierBps,
    };
  }
}

class FakeGetCurrentRoundUseCase {
  output: RoundOutput | null = roundResponse;

  async execute() {
    return this.output;
  }
}

@Module({
  controllers: [GamesController],
  providers: [
    {
      provide: PlaceBetUseCase,
      useClass: FakePlaceBetUseCase,
    },
    {
      provide: CreateRoundUseCase,
      useClass: FakeCreateRoundUseCase,
    },
    {
      provide: GetCurrentRoundUseCase,
      useClass: FakeGetCurrentRoundUseCase,
    },
  ],
})
class TestAppModule {}

describe("GamesController E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let placeBetUseCase: FakePlaceBetUseCase;
  let createRoundUseCase: FakeCreateRoundUseCase;
  let getCurrentRoundUseCase: FakeGetCurrentRoundUseCase;

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
    createRoundUseCase = app.get(CreateRoundUseCase);
    getCurrentRoundUseCase = app.get(GetCurrentRoundUseCase);
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

  it("GET /games/rounds/current - returns the current round", async () => {
    getCurrentRoundUseCase.output = roundResponse;

    const response = await fetch(`${baseUrl}/games/rounds/current`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(roundResponse);
  });

  it("GET /games/rounds/current - maps missing current round to 404", async () => {
    getCurrentRoundUseCase.output = null;

    const response = await fetch(`${baseUrl}/games/rounds/current`);

    getCurrentRoundUseCase.output = roundResponse;

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 404);
    expect(body).toHaveProperty("error", "Not Found");
    expect(body).toHaveProperty("message", "No active round");
  });

  it("POST /games/rounds - creates a betting round", async () => {
    const response = await fetch(`${baseUrl}/games/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roundId: "round-2",
        crashMultiplierBps: 300,
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ...roundResponse,
      roundId: "round-2",
      crashMultiplierBps: 300,
    });
    expect(createRoundUseCase.calls[createRoundUseCase.calls.length - 1]).toEqual({
      roundId: "round-2",
      crashMultiplierBps: 300,
    });
  });

  it("POST /games/rounds - rejects invalid payloads", async () => {
    const response = await fetch(`${baseUrl}/games/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roundId: "",
        crashMultiplierBps: 99,
        unexpected: "not-allowed",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("property unexpected should not exist");
    expect(body.message).toContain("roundId should not be empty");
    expect(body.message).toContain("crashMultiplierBps must not be less than 100");
  });

  it("POST /games/rounds - maps active round conflicts to 409", async () => {
    createRoundUseCase.errorMessage = "There is already an active round";

    const response = await fetch(`${baseUrl}/games/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roundId: "round-2",
        crashMultiplierBps: 300,
      }),
    });

    createRoundUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("error", "Conflict");
    expect(body).toHaveProperty("message", "There is already an active round");
  });

  it("POST /games/bet - places a bet in the current round", async () => {
    const response = await fetch(`${baseUrl}/games/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
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
      betId: "bet-1",
      amountCents: "250",
    });
  });

  it("POST /games/bet - rejects invalid payloads", async () => {
    const response = await fetch(`${baseUrl}/games/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        roundId: "round-1",
        betId: "bet-1",
        amountCents: "0",
        unexpected: "not-allowed",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("property roundId should not exist");
    expect(body.message).toContain("property unexpected should not exist");
    expect(body.message).toContain("amountCents must be a positive integer string");
  });

  it("POST /games/bet - maps wallet debit failures to 422", async () => {
    placeBetUseCase.errorMessage = "Wallet debit failed: INSUFFICIENT_BALANCE";

    const response = await fetch(`${baseUrl}/games/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
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

  it("POST /games/bet - maps game rule failures to 409", async () => {
    placeBetUseCase.errorMessage = "Round is not accepting bets";

    const response = await fetch(`${baseUrl}/games/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
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
