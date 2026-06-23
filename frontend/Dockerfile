FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/games/package.json ./services/games/package.json
COPY services/wallets/package.json ./services/wallets/package.json
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json bun.lock ./
COPY frontend ./frontend
WORKDIR /app/frontend
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production
COPY --from=builder /app/frontend ./
EXPOSE 3000
CMD ["bun", "run", "start"]
