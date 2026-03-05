import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "@/lib/firebase/config";

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: "/api/auth/login",
    logoutPath: "/api/auth/logout",
    apiKey: serverConfig.firebaseApiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    cookieSerializeOptions: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: serverConfig.serviceAccount,
    handleValidToken: async ({ token, decodedToken }, headers) => {
      // User is authenticated - allow through
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async (reason) => {
      // Check if we're on a protected route
      const { pathname } = request.nextUrl;

      // API routes should return 401
      if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/stripe/webhook")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Dashboard routes redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    },
    handleError: async (error) => {
      console.error("Auth middleware error:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    },
  });
}

export const config = {
  matcher: [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/receipts/:path*",
    "/api/expenses/:path*",
    "/api/reports/:path*",
    "/api/settings/:path*",
    "/api/organizations/:path*",
    "/api/stripe/checkout",
    "/api/stripe/portal",
    "/api/stripe/subscription",
    "/expenses/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/billing/:path*",
  ],
};
