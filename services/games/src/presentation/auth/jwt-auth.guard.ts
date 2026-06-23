import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createPublicKey, verify } from "node:crypto";

type JsonWebKeySet = {
  keys: AppJsonWebKey[];
};

type AppJsonWebKey = JsonWebKey & {
  kid?: string;
};

type JwtHeader = {
  alg: string;
  kid?: string;
};

type JwtPayload = {
  sub?: string;
  preferred_username?: string;
  iss?: string;
  aud?: string | string[];
  azp?: string;
  exp?: number;
};

const base64UrlDecode = (value: string): Buffer =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const decodeJsonPart = <T>(value: string): T =>
  JSON.parse(base64UrlDecode(value).toString("utf8")) as T;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks?: JsonWebKeySet;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { playerId: string; username?: string };
    }>();

    if (process.env.AUTH_DISABLED_FOR_TESTS === "true") {
      request.user = {
        playerId: process.env.AUTH_TEST_PLAYER_ID ?? "player-1",
        username: process.env.AUTH_TEST_USERNAME ?? "player",
      };
      return true;
    }

    const token = this.extractBearerToken(request.headers.authorization);
    const payload = await this.verifyToken(token);

    if (!payload.sub) {
      throw new UnauthorizedException("JWT subject is missing");
    }

    request.user = {
      playerId: payload.sub,
      username: payload.preferred_username,
    };

    return true;
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Bearer token is required");
    }

    return token;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException("Invalid JWT format");
    }

    const header = decodeJsonPart<JwtHeader>(encodedHeader);
    const payload = decodeJsonPart<JwtPayload>(encodedPayload);

    if (header.alg !== "RS256") {
      throw new UnauthorizedException("Unsupported JWT algorithm");
    }

    this.ensureValidClaims(payload);

    const jwk = await this.findSigningKey(header.kid);
    const key = createPublicKey({ key: jwk, format: "jwk" });
    const isValidSignature = verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      key,
      base64UrlDecode(encodedSignature),
    );

    if (!isValidSignature) {
      throw new UnauthorizedException("Invalid JWT signature");
    }

    return payload;
  }

  private ensureValidClaims(payload: JwtPayload): void {
    const issuer = this.getIssuer();
    const audience = process.env.KEYCLOAK_AUDIENCE ?? "crash-game-client";
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (payload.iss !== issuer) {
      throw new UnauthorizedException("Invalid JWT issuer");
    }

    if (!payload.exp || payload.exp <= nowInSeconds) {
      throw new UnauthorizedException("JWT is expired");
    }

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (!audiences.includes(audience) && payload.azp !== audience) {
      throw new UnauthorizedException("Invalid JWT audience");
    }
  }

  private async findSigningKey(kid?: string): Promise<AppJsonWebKey> {
    const jwks = await this.getJwks();
    const key = jwks.keys.find((candidate) => !kid || candidate.kid === kid);

    if (!key) {
      throw new UnauthorizedException("JWT signing key not found");
    }

    return key;
  }

  private async getJwks(): Promise<JsonWebKeySet> {
    if (this.jwks) {
      return this.jwks;
    }

    const response = await fetch(
      process.env.KEYCLOAK_JWKS_URL ?? `${this.getIssuer()}/protocol/openid-connect/certs`,
    );

    if (!response.ok) {
      throw new UnauthorizedException("Could not load JWKS");
    }

    this.jwks = (await response.json()) as JsonWebKeySet;
    return this.jwks;
  }

  private getIssuer(): string {
    return (process.env.KEYCLOAK_ISSUER_URL ?? "http://localhost:8080/realms/crash-game").replace(
      /\/$/,
      "",
    );
  }
}
