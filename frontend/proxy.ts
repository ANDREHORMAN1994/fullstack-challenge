import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const protectedRoutes = ["/game", "/wallet", "/my-bets", "/history"];

export default withAuth(
  function middleware(request) {
    const isAuthenticated = Boolean(request.nextauth.token);
    const { pathname } = request.nextUrl;

    if (pathname === "/" && !isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname === "/" && isAuthenticated) {
      return NextResponse.redirect(new URL("/game", request.url));
    }

    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/game", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        const isProtectedRoute = protectedRoutes.some(
          (route) => pathname === route || pathname.startsWith(`${route}/`),
        );

        return isProtectedRoute ? Boolean(token) : true;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/", "/login", "/game/:path*", "/wallet/:path*", "/my-bets/:path*", "/history/:path*"],
};
