import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { GamesController } from "@/presentation/controllers/games.controller";
import { PlaceBetUseCase, type PlaceBetInput } from "@/application/use-cases/place-bet.use-case";
import {
  CashoutBetUseCase,
  type CashoutBetInput,
} from "@/application/use-cases/cashout-bet.use-case";
import {
  CreateRoundUseCase,
  type CreateRoundInput,
  type RoundOutput,
} from "@/application/use-cases/create-round.use-case";
import { GetCurrentRoundUseCase } from "@/application/use-cases/get-current-round.use-case";
import { StartCurrentRoundUseCase } from "@/application/use-cases/start-current-round.use-case";
import { CrashCurrentRoundUseCase } from "@/application/use-cases/crash-current-round.use-case";
import {
  SettleCurrentRoundUseCase,
  type SettleCurrentRoundOutput,
} from "@/application/use-cases/settle-current-round.use-case";
import {
  GetRoundVerificationUseCase,
  type RoundVerificationOutput,
} from "@/application/use-cases/get-round-verification.use-case";
import {
  GetRoundsHistoryUseCase,
  type GetRoundsHistoryOutput,
} from "@/application/use-cases/get-rounds-history.use-case";
import {
  GetMyBetsHistoryUseCase,
  type GetMyBetsHistoryInput,
  type GetMyBetsHistoryOutput,
} from "@/application/use-cases/get-my-bets-history.use-case";

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

class FakeCashoutBetUseCase {
  calls: CashoutBetInput[] = [];
  errorMessage?: string;

  async execute(input: CashoutBetInput) {
    this.calls.push(input);

    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      cashedOut: true,
      betId: "bet-1",
      playerId: input.playerId,
      roundId: "round-1",
      amountCents: "250",
      cashoutMultiplierBps: 120,
      payoutCents: "300",
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "1050",
    };
  }
}

const roundResponse: RoundOutput = {
  roundId: "round-1",
  status: "BETTING",
  serverSeedHash: "server-seed-hash",
  clientSeed: "client-seed",
  nonce: 1,
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
      serverSeedHash: "server-seed-hash",
      clientSeed: input.clientSeed ?? input.roundId,
      nonce: input.nonce ?? 1,
    };
  }
}

class FakeGetCurrentRoundUseCase {
  output: RoundOutput | null = roundResponse;

  async execute() {
    return this.output;
  }
}

class FakeStartCurrentRoundUseCase {
  errorMessage?: string;

  async execute(): Promise<RoundOutput> {
    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      ...roundResponse,
      status: "RUNNING",
      runningStartedAt: "2026-01-01T00:00:10.000Z",
      updatedAt: "2026-01-01T00:00:10.000Z",
    };
  }
}

class FakeCrashCurrentRoundUseCase {
  errorMessage?: string;

  async execute(): Promise<RoundOutput> {
    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      ...roundResponse,
      status: "CRASHED",
      runningStartedAt: "2026-01-01T00:00:10.000Z",
      crashedAt: "2026-01-01T00:00:20.000Z",
      updatedAt: "2026-01-01T00:00:20.000Z",
    };
  }
}

class FakeSettleCurrentRoundUseCase {
  errorMessage?: string;

  async execute(): Promise<SettleCurrentRoundOutput> {
    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      round: {
        ...roundResponse,
        status: "SETTLED",
        runningStartedAt: "2026-01-01T00:00:10.000Z",
        crashedAt: "2026-01-01T00:00:20.000Z",
        settledAt: "2026-01-01T00:00:30.000Z",
        updatedAt: "2026-01-01T00:00:30.000Z",
      },
      lostBetsCount: 2,
    };
  }
}

class FakeGetRoundVerificationUseCase {
  errorMessage?: string;

  async execute(roundId: string): Promise<RoundVerificationOutput> {
    if (this.errorMessage) {
      throw new Error(this.errorMessage);
    }

    return {
      roundId,
      status: "SETTLED",
      serverSeed: "server-seed",
      serverSeedHash: "server-seed-hash",
      clientSeed: "client-seed",
      nonce: 1,
      crashMultiplierBps: 250,
      verified: true,
    };
  }
}

class FakeGetRoundsHistoryUseCase {
  calls: Array<{ page?: number; limit?: number }> = [];

  async execute(input: { page?: number; limit?: number }): Promise<GetRoundsHistoryOutput> {
    this.calls.push(input);

    return {
      items: [
        {
          roundId: "round-1",
          status: "SETTLED",
          crashMultiplierBps: 250,
          serverSeedHash: "server-seed-hash",
          clientSeed: "client-seed",
          nonce: 1,
          bettingStartedAt: "2026-01-01T00:00:00.000Z",
          runningStartedAt: "2026-01-01T00:00:10.000Z",
          crashedAt: "2026-01-01T00:00:20.000Z",
          settledAt: "2026-01-01T00:00:30.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:30.000Z",
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        hasNextPage: false,
      },
    };
  }
}

class FakeGetMyBetsHistoryUseCase {
  calls: GetMyBetsHistoryInput[] = [];

  async execute(input: GetMyBetsHistoryInput): Promise<GetMyBetsHistoryOutput> {
    this.calls.push(input);

    return {
      items: [
        {
          betId: "bet-1",
          playerId: input.playerId,
          roundId: "round-1",
          amountCents: "250",
          status: "CASHED_OUT",
          cashoutMultiplierBps: 150,
          payoutCents: "375",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:15.000Z",
        },
      ],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        hasNextPage: false,
      },
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
    {
      provide: CashoutBetUseCase,
      useClass: FakeCashoutBetUseCase,
    },
    {
      provide: CreateRoundUseCase,
      useClass: FakeCreateRoundUseCase,
    },
    {
      provide: GetCurrentRoundUseCase,
      useClass: FakeGetCurrentRoundUseCase,
    },
    {
      provide: StartCurrentRoundUseCase,
      useClass: FakeStartCurrentRoundUseCase,
    },
    {
      provide: CrashCurrentRoundUseCase,
      useClass: FakeCrashCurrentRoundUseCase,
    },
    {
      provide: SettleCurrentRoundUseCase,
      useClass: FakeSettleCurrentRoundUseCase,
    },
    {
      provide: GetRoundVerificationUseCase,
      useClass: FakeGetRoundVerificationUseCase,
    },
    {
      provide: GetRoundsHistoryUseCase,
      useClass: FakeGetRoundsHistoryUseCase,
    },
    {
      provide: GetMyBetsHistoryUseCase,
      useClass: FakeGetMyBetsHistoryUseCase,
    },
  ],
})
class TestAppModule {}

describe("GamesController E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let placeBetUseCase: FakePlaceBetUseCase;
  let cashoutBetUseCase: FakeCashoutBetUseCase;
  let createRoundUseCase: FakeCreateRoundUseCase;
  let getCurrentRoundUseCase: FakeGetCurrentRoundUseCase;
  let startCurrentRoundUseCase: FakeStartCurrentRoundUseCase;
  let crashCurrentRoundUseCase: FakeCrashCurrentRoundUseCase;
  let settleCurrentRoundUseCase: FakeSettleCurrentRoundUseCase;
  let getRoundVerificationUseCase: FakeGetRoundVerificationUseCase;
  let getRoundsHistoryUseCase: FakeGetRoundsHistoryUseCase;
  let getMyBetsHistoryUseCase: FakeGetMyBetsHistoryUseCase;

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
    cashoutBetUseCase = app.get(CashoutBetUseCase);
    createRoundUseCase = app.get(CreateRoundUseCase);
    getCurrentRoundUseCase = app.get(GetCurrentRoundUseCase);
    startCurrentRoundUseCase = app.get(StartCurrentRoundUseCase);
    crashCurrentRoundUseCase = app.get(CrashCurrentRoundUseCase);
    settleCurrentRoundUseCase = app.get(SettleCurrentRoundUseCase);
    getRoundVerificationUseCase = app.get(GetRoundVerificationUseCase);
    getRoundsHistoryUseCase = app.get(GetRoundsHistoryUseCase);
    getMyBetsHistoryUseCase = app.get(GetMyBetsHistoryUseCase);
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

  it("GET /games/rounds/history - returns paginated round history", async () => {
    const response = await fetch(`${baseUrl}/games/rounds/history?page=2&limit=10`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          roundId: "round-1",
          status: "SETTLED",
          crashMultiplierBps: 250,
          serverSeedHash: "server-seed-hash",
          clientSeed: "client-seed",
          nonce: 1,
          bettingStartedAt: "2026-01-01T00:00:00.000Z",
          runningStartedAt: "2026-01-01T00:00:10.000Z",
          crashedAt: "2026-01-01T00:00:20.000Z",
          settledAt: "2026-01-01T00:00:30.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:30.000Z",
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        hasNextPage: false,
      },
    });
    expect(getRoundsHistoryUseCase.calls[getRoundsHistoryUseCase.calls.length - 1]).toEqual({
      page: 2,
      limit: 10,
    });
  });

  it("GET /games/bets/me - returns paginated player bet history", async () => {
    const response = await fetch(`${baseUrl}/games/bets/me?playerId=player-1&page=1&limit=5`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          betId: "bet-1",
          playerId: "player-1",
          roundId: "round-1",
          amountCents: "250",
          status: "CASHED_OUT",
          cashoutMultiplierBps: 150,
          payoutCents: "375",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:15.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 5,
        hasNextPage: false,
      },
    });
    expect(getMyBetsHistoryUseCase.calls[getMyBetsHistoryUseCase.calls.length - 1]).toEqual({
      playerId: "player-1",
      page: 1,
      limit: 5,
    });
  });

  it("GET /games/bets/me - rejects missing playerId until auth is implemented", async () => {
    const response = await fetch(`${baseUrl}/games/bets/me?page=1&limit=5`);

    expect(response.status).toBe(400);
  });

  it("POST /games/rounds - creates a betting round", async () => {
    const response = await fetch(`${baseUrl}/games/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roundId: "round-2",
        serverSeed: "server-seed",
        clientSeed: "client-seed",
        nonce: 2,
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ...roundResponse,
      roundId: "round-2",
      clientSeed: "client-seed",
      nonce: 2,
    });
    expect(createRoundUseCase.calls[createRoundUseCase.calls.length - 1]).toEqual({
      roundId: "round-2",
      serverSeed: "server-seed",
      clientSeed: "client-seed",
      nonce: 2,
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
        nonce: -1,
        unexpected: "not-allowed",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("property unexpected should not exist");
    expect(body.message).toContain("roundId should not be empty");
    expect(body.message).toContain("nonce must not be less than 0");
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
      }),
    });

    createRoundUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("error", "Conflict");
    expect(body).toHaveProperty("message", "There is already an active round");
  });

  it("GET /games/rounds/:roundId/verify - returns provably fair verification data", async () => {
    const response = await fetch(`${baseUrl}/games/rounds/round-1/verify`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roundId: "round-1",
      status: "SETTLED",
      serverSeed: "server-seed",
      serverSeedHash: "server-seed-hash",
      clientSeed: "client-seed",
      nonce: 1,
      crashMultiplierBps: 250,
      verified: true,
    });
  });

  it("GET /games/rounds/:roundId/verify - maps missing rounds to 404", async () => {
    getRoundVerificationUseCase.errorMessage = "Round not found";

    const response = await fetch(`${baseUrl}/games/rounds/missing/verify`);

    getRoundVerificationUseCase.errorMessage = undefined;

    expect(response.status).toBe(404);
  });

  it("GET /games/rounds/:roundId/verify - maps active rounds to 409", async () => {
    getRoundVerificationUseCase.errorMessage = "Round verification is only available after crash";

    const response = await fetch(`${baseUrl}/games/rounds/round-1/verify`);

    getRoundVerificationUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);
  });

  it("POST /games/rounds/current/start - starts the current round", async () => {
    const response = await fetch(`${baseUrl}/games/rounds/current/start`, {
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      roundId: "round-1",
      status: "RUNNING",
      runningStartedAt: "2026-01-01T00:00:10.000Z",
    });
  });

  it("POST /games/rounds/current/start - maps invalid state to 409", async () => {
    startCurrentRoundUseCase.errorMessage = "Only betting rounds can start running";

    const response = await fetch(`${baseUrl}/games/rounds/current/start`, {
      method: "POST",
    });

    startCurrentRoundUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("message", "Only betting rounds can start running");
  });

  it("POST /games/rounds/current/crash - crashes the current round", async () => {
    const response = await fetch(`${baseUrl}/games/rounds/current/crash`, {
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      roundId: "round-1",
      status: "CRASHED",
      crashedAt: "2026-01-01T00:00:20.000Z",
    });
  });

  it("POST /games/rounds/current/crash - maps invalid state to 409", async () => {
    crashCurrentRoundUseCase.errorMessage = "Only running rounds can crash";

    const response = await fetch(`${baseUrl}/games/rounds/current/crash`, {
      method: "POST",
    });

    crashCurrentRoundUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("message", "Only running rounds can crash");
  });

  it("POST /games/rounds/current/settle - settles the current round and returns lost bet count", async () => {
    const response = await fetch(`${baseUrl}/games/rounds/current/settle`, {
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      round: {
        ...roundResponse,
        status: "SETTLED",
        runningStartedAt: "2026-01-01T00:00:10.000Z",
        crashedAt: "2026-01-01T00:00:20.000Z",
        settledAt: "2026-01-01T00:00:30.000Z",
        updatedAt: "2026-01-01T00:00:30.000Z",
      },
      lostBetsCount: 2,
    });
  });

  it("POST /games/rounds/current/settle - maps invalid state to 409", async () => {
    settleCurrentRoundUseCase.errorMessage = "Only crashed rounds can be settled";

    const response = await fetch(`${baseUrl}/games/rounds/current/settle`, {
      method: "POST",
    });

    settleCurrentRoundUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("message", "Only crashed rounds can be settled");
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

  it("POST /games/bet/cashout - cashes out the current round bet", async () => {
    const response = await fetch(`${baseUrl}/games/bet/cashout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      cashedOut: true,
      betId: "bet-1",
      playerId: "player-1",
      roundId: "round-1",
      amountCents: "250",
      cashoutMultiplierBps: 120,
      payoutCents: "300",
      walletTransactionId: "transaction-1",
      walletBalanceAfterCents: "1050",
    });
    expect(cashoutBetUseCase.calls[cashoutBetUseCase.calls.length - 1]).toEqual({
      playerId: "player-1",
    });
  });

  it("POST /games/bet/cashout - rejects invalid payloads", async () => {
    const response = await fetch(`${baseUrl}/games/bet/cashout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "",
        cashoutMultiplierBps: 120,
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("playerId should not be empty");
    expect(body.message).toContain("property cashoutMultiplierBps should not exist");
  });

  it("POST /games/bet/cashout - maps wallet credit failures to 422", async () => {
    cashoutBetUseCase.errorMessage = "Wallet cashout credit failed: WALLET_NOT_FOUND";

    const response = await fetch(`${baseUrl}/games/bet/cashout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
      }),
    });

    cashoutBetUseCase.errorMessage = undefined;

    expect(response.status).toBe(422);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 422);
    expect(body).toHaveProperty("error", "Unprocessable Entity");
    expect(body).toHaveProperty("message", "Wallet cashout credit failed: WALLET_NOT_FOUND");
  });

  it("POST /games/bet/cashout - maps game rule failures to 409", async () => {
    cashoutBetUseCase.errorMessage = "Player has no bet in current round";

    const response = await fetch(`${baseUrl}/games/bet/cashout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
      }),
    });

    cashoutBetUseCase.errorMessage = undefined;

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("error", "Conflict");
    expect(body).toHaveProperty("message", "Player has no bet in current round");
  });
});
