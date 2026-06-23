import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type AuthenticatedPlayer = {
  playerId: string;
  username?: string;
};

export const AuthenticatedPlayer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPlayer => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedPlayer }>();

    if (!request.user) {
      throw new Error("Authenticated player not found in request");
    }

    return request.user;
  },
);
