import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // 2. Extract notification ID from params
    const { id: notificationId } = await context.params;
    if (!notificationId || typeof notificationId !== "string" || !notificationId.trim()) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const trimmedId = notificationId.trim();

    // 3. Strict ownership check: Must match BOTH notification.id and notification.userId
    const existing = await prisma.notification.findFirst({
      where: {
        id: trimmedId,
        userId: payload.id,
      },
    });

    if (!existing) {
      // Return 404 without revealing existence of notifications belonging to other users
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // 4. Mark notification as read (idempotent update)
    const updated = await prisma.notification.update({
      where: { id: existing.id },
      data: { isRead: true },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      notification: updated,
    }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read ERROR:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
