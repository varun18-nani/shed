import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestId, logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  try {
    const body = await request.json();
    const { sectionId, academicYear, candidateId, entries } = body;

    // 1. Validate inputs
    if (!sectionId || !academicYear || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "sectionId, academicYear, and a non-empty list of entries are required.", requestId },
        { status: 400 }
      );
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found.", requestId }, { status: 404 });
    }

    // 2. Check Existing Timetable Status
    const existingEntries = await prisma.timetableEntry.findMany({
      where: { sectionId, academicYear },
    });

    if (existingEntries.length > 0) {
      const isPublished = existingEntries.some((e) => e.status === "PUBLISHED");
      const isArchived = existingEntries.some((e) => e.status === "ARCHIVED");

      if (isPublished) {
        return NextResponse.json(
          {
            error: "Cannot replace a PUBLISHED timetable. You must archive it before creating a new schedule.",
            requestId,
          },
          { status: 409 }
        );
      }

      if (isArchived) {
        return NextResponse.json(
          {
            error: "Cannot replace an ARCHIVED timetable.",
            requestId,
          },
          { status: 409 }
        );
      }
    }

    // 3. Server-authoritative Validation of Candidate Entries
    // Verify each entry references valid database entities and respects constraints
    const otherEntries = await prisma.timetableEntry.findMany({
      where: {
        academicYear,
        sectionId: { not: sectionId },
      },
    });

    const occupiedFaculty = new Set<string>();
    const occupiedRoom = new Set<string>();
    const occupiedSection = new Set<string>();

    for (const e of otherEntries) {
      occupiedFaculty.add(`${e.facultyId}_${e.timeSlotId}`);
      occupiedRoom.add(`${e.roomId}_${e.timeSlotId}`);
      if (e.sectionId) occupiedSection.add(`${e.sectionId}_${e.timeSlotId}`);
    }

    const internalOccupiedFaculty = new Set<string>();
    const internalOccupiedRoom = new Set<string>();
    const internalOccupiedSlot = new Set<string>();

    for (const entry of entries) {
      const { subjectId, facultyId, roomId, timeSlotId } = entry;
      if (!subjectId || !facultyId || !roomId || !timeSlotId) {
        return NextResponse.json(
          { error: "Invalid entry format: subjectId, facultyId, roomId, and timeSlotId are required for every period.", requestId },
          { status: 400 }
        );
      }

      const facultyKey = `${facultyId}_${timeSlotId}`;
      const roomKey = `${roomId}_${timeSlotId}`;
      const slotKey = `${sectionId}_${timeSlotId}`;

      // Check against other sections
      if (occupiedFaculty.has(facultyKey) || internalOccupiedFaculty.has(facultyKey)) {
        return NextResponse.json(
          { error: `Faculty clash detected during validation for time slot ${timeSlotId}.`, requestId },
          { status: 409 }
        );
      }
      if (occupiedRoom.has(roomKey) || internalOccupiedRoom.has(roomKey)) {
        return NextResponse.json(
          { error: `Room clash detected during validation for room ${roomId} at time slot ${timeSlotId}.`, requestId },
          { status: 409 }
        );
      }
      if (occupiedSection.has(slotKey) || internalOccupiedSlot.has(slotKey)) {
        return NextResponse.json(
          { error: `Section duplicate slot detected at time slot ${timeSlotId}.`, requestId },
          { status: 409 }
        );
      }

      internalOccupiedFaculty.add(facultyKey);
      internalOccupiedRoom.add(roomKey);
      internalOccupiedSlot.add(slotKey);
    }

    // 4. Atomic Database Transaction: Delete Existing Draft (if any) and Insert Selected Candidate
    const entriesToInsert = entries.map((e: any) => ({
      subjectId: e.subjectId,
      facultyId: e.facultyId,
      roomId: e.roomId,
      timeSlotId: e.timeSlotId,
      sectionId,
      studentId: null,
      status: "DRAFT" as const,
      academicYear,
    }));

    let insertedEntries;
    try {
      insertedEntries = await prisma.$transaction(async (tx) => {
        // If existing DRAFT entries exist for this section and academicYear, remove them atomically
        if (existingEntries.length > 0) {
          await tx.timetableEntry.deleteMany({
            where: { sectionId, academicYear, status: "DRAFT" },
          });
        }

        await tx.timetableEntry.createMany({ data: entriesToInsert });

        return tx.timetableEntry.findMany({
          where: { sectionId, academicYear },
          include: {
            subject: { select: { code: true, name: true, credits: true } },
            faculty: { select: { id: true, employeeId: true, user: { select: { firstName: true, lastName: true } } } },
            room: { select: { id: true, roomNumber: true, building: true, type: true } },
            timeSlot: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true } },
          },
          orderBy: [
            { timeSlot: { dayOfWeek: "asc" } },
            { timeSlot: { startTime: "asc" } },
          ],
        });
      }, { timeout: 30000 });
    } catch (txError: any) {
      logger.error("Transaction failed during candidate selection", {
        route: "/api/timetable/optimize/select",
        requestId,
        error: txError?.message,
      });
      return NextResponse.json(
        { error: "Failed to persist selected candidate timetable.", requestId },
        { status: 500 }
      );
    }

    logger.info("Candidate timetable selected & persisted successfully", {
      route: "/api/timetable/optimize/select",
      requestId,
      sectionId,
      academicYear,
      candidateId,
      insertedCount: insertedEntries.length,
    });

    return NextResponse.json({
      success: true,
      message: `Selected candidate successfully applied as DRAFT timetable (${insertedEntries.length} periods created).`,
      sectionId,
      academicYear,
      candidateId,
      insertedCount: insertedEntries.length,
      entries: insertedEntries,
      requestId,
    }, { status: 201 });

  } catch (error: any) {
    logger.error("POST /api/timetable/optimize/select unexpected error", {
      route: "/api/timetable/optimize/select",
      requestId,
      error: error?.message,
    });

    return NextResponse.json(
      { error: "An unexpected error occurred during candidate selection.", requestId },
      { status: 500 }
    );
  }
}
