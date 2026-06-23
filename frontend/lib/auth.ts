import type { AuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const issuer = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/crash-game";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? "crash-game-client",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
      issuer,
      authorization: {
        params: {
          scope: "openid profile email",
          code_challenge_method: "S256",
        },
      },
    }),
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
