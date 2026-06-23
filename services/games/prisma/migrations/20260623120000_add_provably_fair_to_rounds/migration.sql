ALTER TABLE "rounds"
ADD COLUMN "serverSeed" TEXT NOT NULL DEFAULT 'legacy-server-seed',
ADD COLUMN "serverSeedHash" TEXT NOT NULL DEFAULT 'legacy-server-seed-hash',
ADD COLUMN "clientSeed" TEXT NOT NULL DEFAULT 'legacy-client-seed',
ADD COLUMN "nonce" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "rounds" ALTER COLUMN "serverSeed" DROP DEFAULT;
ALTER TABLE "rounds" ALTER COLUMN "serverSeedHash" DROP DEFAULT;
ALTER TABLE "rounds" ALTER COLUMN "clientSeed" DROP DEFAULT;
ALTER TABLE "rounds" ALTER COLUMN "nonce" DROP DEFAULT;
