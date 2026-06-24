import type { AuthOptions } from "next-auth";

const publicIssuer = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game";
const internalIssuer = process.env.KEYCLOAK_INTERNAL_ISSUER ?? publicIssuer;
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client";
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET ?? "";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    {
      id: "keycloak",
      name: "Keycloak",
      type: "oauth",
      clientId,
      clientSecret,
      issuer: publicIssuer,
      authorization: {
        url: `${publicIssuer}/protocol/openid-connect/auth`,
        params: {
          scope: "openid profile email",
          code_challenge_method: "S256",
        },
      },
      token: `${internalIssuer}/protocol/openid-connect/token`,
      userinfo: `${internalIssuer}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${internalIssuer}/protocol/openid-connect/certs`,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }

      if (profile) {
        const oidcProfile = profile as typeof profile & {
          preferred_username?: string;
        };

        token.username =
          oidcProfile.preferred_username ??
          oidcProfile.name ??
          token.name ??
          undefined;
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.sub;
      session.user.username = token.username ?? token.name ?? token.email ?? undefined;

      return session;
    },
  },
};
