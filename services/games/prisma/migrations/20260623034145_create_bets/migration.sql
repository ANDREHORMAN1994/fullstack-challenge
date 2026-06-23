-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PLACED', 'CASHED_OUT', 'LOST');

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PLACED',
    "cashoutMultiplierBps" INTEGER,
    "payoutCents" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bets_roundId_idx" ON "bets"("roundId");

-- CreateIndex
CREATE INDEX "bets_playerId_idx" ON "bets"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "bets_roundId_playerId_key" ON "bets"("roundId", "playerId");
