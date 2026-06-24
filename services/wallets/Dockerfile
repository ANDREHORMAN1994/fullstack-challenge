FROM oven/bun:1.3.14-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/games/package.json ./services/games/package.json
COPY services/wallets/package.json ./services/wallets/package.json
COPY frontend/package.json ./frontend/package.json
RUN bun install --frozen-lockfile

COPY packages/contracts ./packages/contracts
COPY services/wallets ./services/wallets

EXPOSE 4002

CMD ["sh", "-c", "cd services/wallets && bunx prisma generate && bunx prisma migrate deploy && bun run start"]
