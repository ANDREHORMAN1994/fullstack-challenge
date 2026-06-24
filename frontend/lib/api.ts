export type RoundStatus = "BETTING" | "RUNNING" | "CRASHED" | "SETTLED" | string;

export type Round = {
  roundId: string;
  status: RoundStatus;
  crashMultiplierBps?: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  serverSeed?: string;
  bettingStartedAt: string;
  runningStartedAt?: string;
  crashedAt?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BetStatus = "PLACED" | "CASHED_OUT" | "LOST" | string;

export type Bet = {
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  status?: BetStatus;
  cashoutMultiplierBps?: number;
  payoutCents?: string;
  createdAt?: string;
};

export type Wallet = {
  walletId: string;
  playerId: string;
  balanceCents: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedRounds = {
  items: Round[];
  pagination: Pagination;
};

export type PaginatedBets = {
  items: Bet[];
  pagination: Pagination;
};

export type Pagination = {
  page: number;
  limit: number;
  hasNextPage: boolean;
};

export type RoundVerification = {
  roundId: string;
  status: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashMultiplierBps: number;
  verified: boolean;
};

export type PlaceBetResponse = {
  accepted: boolean;
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  walletTransactionId: string;
  walletBalanceAfterCents: string;
};

export type CashoutResponse = {
  cashedOut: boolean;
  betId: string;
  playerId: string;
  roundId: string;
  amountCents: string;
  cashoutMultiplierBps: number;
  payoutCents: string;
  walletTransactionId: string;
  walletBalanceAfterCents: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GAMES_API_BASE_URL = process.env.NEXT_PUBLIC_GAMES_API_BASE_URL ?? API_BASE_URL;
const WALLETS_API_BASE_URL = process.env.NEXT_PUBLIC_WALLETS_API_BASE_URL ?? API_BASE_URL;

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
  baseUrl?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${options.baseUrl ?? API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const crashApi = {
  getCurrentRound: () => request<Round>("/games/rounds/current", { baseUrl: GAMES_API_BASE_URL }),
  getRoundHistory: () =>
    request<PaginatedRounds>("/games/rounds/history?page=1&limit=20", {
      baseUrl: GAMES_API_BASE_URL,
    }),
  getRoundVerification: (roundId: string) =>
    request<RoundVerification>(`/games/rounds/${roundId}/verify`, { baseUrl: GAMES_API_BASE_URL }),
  getMyBets: (token: string) =>
    request<PaginatedBets>("/games/bets/me?page=1&limit=20", {
      token,
      baseUrl: GAMES_API_BASE_URL,
    }),
  getWallet: (token: string) => request<Wallet>("/wallets/me", { token, baseUrl: WALLETS_API_BASE_URL }),
  createWallet: (token: string) =>
    request<Wallet>("/wallets", {
      token,
      method: "POST",
      body: {},
      baseUrl: WALLETS_API_BASE_URL,
    }),
  placeBet: (token: string, amountCents: number) =>
    request<PlaceBetResponse>("/games/bet", {
      token,
      method: "POST",
      baseUrl: GAMES_API_BASE_URL,
      body: {
        betId: crypto.randomUUID(),
        amountCents: String(amountCents),
      },
    }),
  cashout: (token: string) =>
    request<CashoutResponse>("/games/bet/cashout", {
      token,
      method: "POST",
      baseUrl: GAMES_API_BASE_URL,
      body: {},
    }),
};
