import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET environment variable is not set. Cannot operate securely in production."
      );
    }
    return new TextEncoder().encode("schedai_dev_only_fallback_do_not_use_in_production");
  }
  return new TextEncoder().encode(secret);
};

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only want to protect these specific paths
  const isAdminPath = pathname.startsWith("/admin");
  const isFacultyPath = pathname.startsWith("/faculty");
  const isStudentPath = pathname.startsWith("/student");
  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/health");

  const requestId = request.headers.get("x-request-id") || `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  if (!isAdminPath && !isFacultyPath && !isStudentPath && !isProtectedApi) {
    const response = NextResponse.next();
    response.headers.set("X-Request-ID", requestId);
    return addSecurityHeaders(response);
  }

  const sessionCookie = request.cookies.get("session")?.value;

  // No session token -> redirect to login (or 401 for APIs)
  if (!sessionCookie) {
    if (isProtectedApi) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload;
  try {
    const verified = await jwtVerify(sessionCookie, getSecret());
    payload = verified.payload;
  } catch {
    // Invalid token -> redirect to login (or 401 for APIs)
    if (isProtectedApi) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  const role = payload.role;

  // Role-based route protection
  if (isAdminPath && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }
  if (isFacultyPath && role !== "FACULTY") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }
  if (isStudentPath && role !== "STUDENT") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // API protection: POST/PUT/PATCH/DELETE require ADMIN role
  // Exception: faculty/student portal APIs handle their own fine-grained authorization
  if (isProtectedApi) {
    const isUserSelfServiceApi =
      pathname.startsWith("/api/faculty/") ||
      pathname.startsWith("/api/student/") ||
      pathname.startsWith("/api/dashboard/faculty") ||
      pathname.startsWith("/api/dashboard/student") ||
      pathname.startsWith("/api/notifications");

    if (
      request.method !== "GET" &&
      role !== "ADMIN" &&
      !isUserSelfServiceApi
    ) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
      );
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

function getDashboardPath(role: unknown): string {
  if (role === "ADMIN") return "/admin";
  if (role === "FACULTY") return "/faculty";
  if (role === "STUDENT") return "/student";
  return "/login";
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/faculty/:path*",
    "/student/:path*",
    "/api/:path*",
  ],
};
