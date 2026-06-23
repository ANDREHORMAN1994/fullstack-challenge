-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'RUNNING', 'CRASHED', 'SETTLED');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'BETTING',
    "crashMultiplierBps" INTEGER NOT NULL,
    "bettingStartedAt" TIMESTAMP(3) NOT NULL,
    "runningStartedAt" TIMESTAMP(3),
    "crashedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rounds_status_createdAt_idx" ON "rounds"("status", "createdAt");
