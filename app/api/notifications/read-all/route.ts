import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate user session
    let sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("session")?.value;
      } catch {
        // Fallback for direct test invocation
      }
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // 2. Mark all unread notifications belonging strictly to the authenticated user as read
    const updateResult = await prisma.notification.updateMany({
      where: {
        userId: payload.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
    }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/notifications/read-all ERROR:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
