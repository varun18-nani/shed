import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================
// DELETE /api/timetable/discard
// Safely removes all DRAFT TimetableEntry rows for a given
// sectionId + academicYear pair.  Rejects if any matching
// entry is not in DRAFT status to prevent accidental data loss.
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    let sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("session")?.value;
      } catch {
        // fallback for direct test invocation
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid session" },
        { status: 401 }
      );
    }

    if (payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sectionId, academicYear } = body;

    // 1. Validate required fields
    if (!sectionId || typeof sectionId !== "string" || !sectionId.trim()) {
      return NextResponse.json(
        { error: "sectionId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!academicYear || typeof academicYear !== "string" || !academicYear.trim()) {
      return NextResponse.json(
        { error: "academicYear is required and must be a string" },
        { status: 400 }
      );
    }

    const trimmedSectionId = sectionId.trim();
    const trimmedAcademicYear = academicYear.trim();

    // 2. Run validation + deletion atomically
    const result = await prisma.$transaction(async (tx) => {
      // Find all entries for this section + academic year
      const entries = await tx.timetableEntry.findMany({
        where: {
          sectionId: trimmedSectionId,
          academicYear: trimmedAcademicYear,
        },
        select: { id: true, status: true },
      });

      // 3. Return 404 if no entries exist
      if (entries.length === 0) {
        return { notFound: true };
      }

      // 4. Reject if ANY entry is not DRAFT — never delete PUBLISHED or ARCHIVED entries
      const nonDraftEntries = entries.filter((e) => e.status !== "DRAFT");
      if (nonDraftEntries.length > 0) {
        const statuses = [...new Set(nonDraftEntries.map((e) => e.status))].join(", ");
        return {
          conflict: true,
          message: `Cannot discard: ${nonDraftEntries.length} entry(ies) have status ${statuses}. Only DRAFT timetables can be discarded.`,
        };
      }

      // 5. Safe to delete — all entries are DRAFT
      // Restrict deletion to the exact IDs we verified, ensuring their status is still DRAFT.
      const deleted = await tx.timetableEntry.deleteMany({
        where: {
          id: { in: entries.map((e) => e.id) },
          status: "DRAFT",
        },
      });

      // Concurrency check: If the deleted count doesn't match the number of entries we validated,
      // it means some entries were concurrently modified (e.g. published) or deleted.
      if (deleted.count !== entries.length) {
        throw new Error("CONCURRENCY_CONFLICT");
      }

      return { deletedCount: deleted.count };
    });

    // Handle transaction outcomes
    if ("notFound" in result && result.notFound) {
      return NextResponse.json(
        { error: "No timetable entries found for this section and academic year" },
        { status: 404 }
      );
    }

    if ("conflict" in result && result.conflict) {
      return NextResponse.json(
        { error: result.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENCY_CONFLICT") {
      return NextResponse.json(
        { error: "Concurrent modification detected. Some entries changed status during deletion. Please try again." },
        { status: 409 }
      );
    }
    
    console.error("DELETE /api/timetable/discard ERROR:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while discarding the draft timetable" },
      { status: 500 }
    );
  }
}
