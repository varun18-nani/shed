import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return new TextEncoder().encode("fallback_development_secret_only");
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only want to protect these specific paths
  const isAdminPath = pathname.startsWith("/admin");
  const isFacultyPath = pathname.startsWith("/faculty");
  const isStudentPath = pathname.startsWith("/student");
  const isProtectedApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/");

  if (!isAdminPath && !isFacultyPath && !isStudentPath && !isProtectedApi) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("session")?.value;

  // No session token -> redirect to login (or 401 for APIs)
  if (!sessionCookie) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload;
  try {
    const verified = await jwtVerify(sessionCookie, getSecret());
    payload = verified.payload;
  } catch (err) {
    // Invalid token -> redirect to login (or 401 for APIs)
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // API protection
  if (isProtectedApi) {
    // Only allow GET requests for non-admins, unless it's a specific route?
    // Wait, the requirement says: "POST and DELETE must require an authenticated ADMIN session."
    // "Do not allow FACULTY or STUDENT to perform admin CRUD operations."
    
    // For now, let's allow all GETs to pass if authenticated (as UI might need them).
    // For POST/DELETE/PUT/PATCH, enforce ADMIN role.
    if (request.method !== "GET" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
  }

  return NextResponse.next();
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
