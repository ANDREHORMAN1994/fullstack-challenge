import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { AppModule } from "@/app.module";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/database/prisma/prisma.service";

describe("WalletsController E2E", () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    prisma = app.get(PrismaService);

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
  });

  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("test /health data", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toEqual({
      status: "ok",
      service: "wallets",
    });
  });

  it("creates a wallet", async () => {
    const response = await fetch(`${baseUrl}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        currency: "BRL",
      }),
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("playerId", "player-1");
    expect(body).toHaveProperty("balanceCents", "0");
    expect(body).toHaveProperty("currency", "BRL");
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("updatedAt");
  });

  it("finds a wallet by playerId", async () => {
    await fetch(`${baseUrl}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId: "player-1",
        currency: "BRL",
      }),
    });

    const response = await fetch(`${baseUrl}/wallets/player-1`);

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("playerId", "player-1");
    expect(body).toHaveProperty("balanceCents", "0");
    expect(body).toHaveProperty("currency", "BRL");
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("updatedAt");
  });

  it("returns conflict when creating a wallet for an existing player", async () => {
    const payload = {
      playerId: "player-1",
      currency: "BRL",
    };

    await fetch(`${baseUrl}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const response = await fetch(`${baseUrl}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 409);
    expect(body).toHaveProperty("error", "Conflict");
    expect(body).toHaveProperty("message", "Wallet already exists for this player");
  });

  it("returns not found when wallet does not exist", async () => {
    const response = await fetch(`${baseUrl}/wallets/player-not-found`);

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 404);
    expect(body).toHaveProperty("error", "Not Found");
    expect(body).toHaveProperty("message", "Wallet not found");
  });

  it("returns bad request when create wallet payload is invalid", async () => {
    const response = await fetch(`${baseUrl}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currency: "BRL",
        unexpected: "not-allowed",
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toHaveProperty("statusCode", 400);
    expect(body).toHaveProperty("error", "Bad Request");
    expect(body.message).toContain("property unexpected should not exist");
    expect(body.message).toContain("playerId should not be empty");
    expect(body.message).toContain("playerId must be a string");
  });

  it("check /wallets/debit-bet make two calls with the same operationId and debit only once", async () => {
    await prisma.wallet.create({
      data: {
        id: "wallet-1",
        playerId: "player-1",
        currency: "BRL",
        balanceCents: 1000n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const wallet1 = await prisma.wallet.findUnique({
      where: { playerId: "player-1" },
    });

    expect(wallet1).not.toBeNull();
    expect(wallet1?.balanceCents).toBe(1000n);

    const body = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "250",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const response1 = await fetch(`${baseUrl}/wallets/debit-bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    expect(response1.status).toBe(201);
    const responseBody1 = await response1.json();

    const response2 = await fetch(`${baseUrl}/wallets/debit-bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    expect(response2.status).toBe(201);
    const responseBody2 = await response2.json();

    expect(responseBody1.id).toBe(responseBody2.id);
    expect(responseBody1.operationId).toBe("operation-1");
    expect(responseBody2.operationId).toBe("operation-1");
    expect(responseBody1.type).toBe("BET_DEBIT");
    expect(responseBody1.amountCents).toBe("250");
    expect(responseBody1.balanceBeforeCents).toBe("1000");
    expect(responseBody1.balanceAfterCents).toBe("750");
    expect(responseBody2.balanceBeforeCents).toBe("1000");
    expect(responseBody2.balanceAfterCents).toBe("750");

    const wallet2 = await prisma.wallet.findUnique({
      where: { playerId: "player-1" },
    });

    expect(wallet2).not.toBeNull();
    expect(wallet2?.balanceCents).toBe(750n);

    const transactions = await prisma.walletTransaction.findMany({
      where: { operationId: "operation-1" },
    });

    expect(transactions).toHaveLength(1);
  });

  it("check /wallets/debit-bet and throw error Insufficient balance", async () => {
    await prisma.wallet.create({
      data: {
        id: "wallet-1",
        playerId: "player-1",
        currency: "BRL",
        balanceCents: 0n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const body = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "250",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const response = await fetch(`${baseUrl}/wallets/debit-bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(422);

    const data = await response.json();
    expect(data).toHaveProperty("message", "Insufficient balance");
  });

  it("check /wallets/debit-bet and throw error Wallet not found", async () => {
    const body = {
      playerId: "player-1",
      operationId: "operation-1",
      amountCents: "250",
      referenceRoundId: "round-1",
      referenceBetId: "bet-1",
    };

    const response = await fetch(`${baseUrl}/wallets/debit-bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty("message", "Wallet not found");
  });

  it("check /wallets/debit-bet and throw error Bad Request", async () => {
    const body = {
      abc: "abc",
    };

    const response = await fetch(`${baseUrl}/wallets/debit-bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error", "Bad Request");
  });
});
