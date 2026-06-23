import { afterEach, describe, expect, it } from "bun:test";
import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "@/presentation/auth/jwt-auth.guard";

const makeContext = (authorization?: string) => {
  const request = {
    headers: {
      authorization,
    },
    user: undefined as { playerId: string; username?: string } | undefined,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;

  return { context, request };
};

describe("JwtAuthGuard", () => {
  afterEach(() => {
    delete process.env.AUTH_DISABLED_FOR_TESTS;
    delete process.env.AUTH_TEST_PLAYER_ID;
  });

  it("rejects requests without a bearer token", async () => {
    const guard = new JwtAuthGuard();
    const { context } = makeContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("injects a test player when auth is disabled for tests", async () => {
    process.env.AUTH_DISABLED_FOR_TESTS = "true";
    process.env.AUTH_TEST_PLAYER_ID = "player-test";
    const guard = new JwtAuthGuard();
    const { context, request } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      playerId: "player-test",
      username: "player",
    });
  });
});
