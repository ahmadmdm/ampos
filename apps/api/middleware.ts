import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://127.0.0.1:3002,http://127.0.0.1:3003,http://127.0.0.1:3004,http://127.0.0.1:3005")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

function withCors(req: NextRequest, response: NextResponse): NextResponse {
  const origin = req.headers.get("origin") ?? "";
  if (allowedOrigins.includes(origin)) {
    response.headers.set("access-control-allow-origin", origin);
    response.headers.set("vary", "origin");
  }
  response.headers.set("access-control-allow-headers", "content-type, authorization, x-org-id, x-branch-id, x-roles, x-user-id, x-device-id, x-device-token, x-csrf-token, x-request-id");
  response.headers.set("access-control-allow-methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  return response;
}

function shouldSkipCsrf(req: NextRequest): boolean {
  const pathname = req.nextUrl.pathname;
  // Skip CSRF for webhook callbacks
  if (pathname.startsWith("/api/payments/webhooks/")) return true;
  // Skip CSRF for auth routes that are called before a session exists
  if (pathname === "/api/auth/login" || pathname === "/api/auth/refresh" || pathname === "/api/auth/csrf") return true;
  // Skip CSRF for POS device endpoints
  if (pathname.startsWith("/api/pos/")) return true;
  // Skip CSRF for native clients using Bearer token or device token auth (Android/iOS)
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return true;
  if (req.headers.get("x-device-token")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCors(req, new NextResponse(null, { status: 204 }));
  }
  if (!["GET", "HEAD"].includes(req.method) && !shouldSkipCsrf(req)) {
    const csrfCookie = req.cookies.get("csrf_token")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");
    if (!csrfCookie || csrfHeader !== csrfCookie) {
      return withCors(
        req,
        NextResponse.json({ ok: false, error: "CSRF_TOKEN_MISMATCH" }, { status: 403 })
      );
    }
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  response.headers.set("x-request-id", requestId);
  return withCors(req, response);
}

export const config = {
  matcher: ["/api/:path*"]
};
