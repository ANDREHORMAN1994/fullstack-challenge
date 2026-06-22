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
});
