import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestId, logger } from "@/lib/logger";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const startTime = Date.now();

  try {
    // Perform a lightweight database ping
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - startTime;

    logger.info("Health check passed", {
      route: "/api/health",
      requestId,
      durationMs: duration,
      event: "health_check_success"
    });

    const response = NextResponse.json({
      status: "ok",
      database: {
        status: "connected",
        latencyMs: duration,
      },
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    }, { status: 200 });

    response.headers.set("X-Request-ID", requestId);
    return response;
  } catch (error: any) {
    logger.error("Health check database failure", {
      route: "/api/health",
      requestId,
      event: "health_check_failure",
      error: error?.message || "Unknown database error"
    });

    const response = NextResponse.json({
      status: "error",
      database: "unavailable",
      timestamp: new Date().toISOString()
    }, { status: 503 });

    response.headers.set("X-Request-ID", requestId);
    return response;
  }
}
