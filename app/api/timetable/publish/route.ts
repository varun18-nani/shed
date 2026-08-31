import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectionId, academicYear } = body;

    // 1. Validate request body
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

    // 2. Verify the section exists
    const section = await prisma.section.findUnique({
      where: { id: trimmedSectionId },
      include: { department: true }
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // 3. Find all TimetableEntry records matching sectionId + academicYear
    const entries = await prisma.timetableEntry.findMany({
      where: {
        sectionId: trimmedSectionId,
        academicYear: trimmedAcademicYear
      },
      include: {
        subject: true,
        faculty: true,
        room: true,
        timeSlot: true
      }
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No timetable entries found for this section and academic year" },
        { status: 404 }
      );
    }

    // 4. Publishing is only valid when ALL matching entries are currently DRAFT
    const hasPublished = entries.some(e => e.status === "PUBLISHED");
    const hasArchived = entries.some(e => e.status === "ARCHIVED");

    if (hasPublished) {
      return NextResponse.json(
        { error: "Timetable is already published for this section and academic year" },
        { status: 409 }
      );
    }

    if (hasArchived) {
      return NextResponse.json(
        { error: "Cannot publish an archived timetable" },
        { status: 409 }
      );
    }

    const nonDraftEntries = entries.filter(e => e.status !== "DRAFT");
    if (nonDraftEntries.length > 0) {
      return NextResponse.json(
        { error: "Only DRAFT timetables can be published" },
        { status: 409 }
      );
    }

    // 5. Final consistency & conflict validation before publishing
    // Check all referenced entities still exist and rooms are available
    for (const entry of entries) {
      if (!entry.subject) {
        return NextResponse.json(
          { error: `Referenced subject (${entry.subjectId}) does not exist` },
          { status: 409 }
        );
      }
      if (!entry.faculty) {
        return NextResponse.json(
          { error: `Referenced faculty (${entry.facultyId}) does not exist` },
          { status: 409 }
        );
      }
      if (!entry.room) {
        return NextResponse.json(
          { error: `Referenced room (${entry.roomId}) does not exist` },
          { status: 409 }
        );
      }
      if (!entry.timeSlot) {
        return NextResponse.json(
          { error: `Referenced time slot (${entry.timeSlotId}) does not exist` },
          { status: 409 }
        );
      }

      if (entry.room.status === "MAINTENANCE" || entry.room.status === "UNAVAILABLE") {
        return NextResponse.json(
          {
            error: `Room ${entry.room.roomNumber} is currently ${entry.room.status} and cannot be scheduled`
          },
          { status: 409 }
        );
      }
    }

    // Conflict detection against other published or active schedules in the same academic year
    const entryIds = entries.map(e => e.id);

    // Fetch all external entries in the same academic year to detect conflicts
    const otherEntries = await prisma.timetableEntry.findMany({
      where: {
        academicYear: trimmedAcademicYear,
        id: { notIn: entryIds }
      }
    });

    for (const entry of entries) {
      // Check faculty conflict with another section/class
      const facultyClash = otherEntries.find(
        o => o.timeSlotId === entry.timeSlotId && o.facultyId === entry.facultyId
      );
      if (facultyClash) {
        return NextResponse.json(
          {
            error: `Faculty conflict detected: ${entry.faculty.employeeId} is already scheduled during time slot on day ${entry.timeSlot.dayOfWeek}`
          },
          { status: 409 }
        );
      }

      // Check room conflict with another section/class
      const roomClash = otherEntries.find(
        o => o.timeSlotId === entry.timeSlotId && o.roomId === entry.roomId
      );
      if (roomClash) {
        return NextResponse.json(
          {
            error: `Room conflict detected: Room ${entry.room.roomNumber} is already occupied during time slot on day ${entry.timeSlot.dayOfWeek}`
          },
          { status: 409 }
        );
      }
    }

    // Internal duplicate slot checks within this section's entries
    const seenSlots = new Set<string>();
    for (const entry of entries) {
      if (seenSlots.has(entry.timeSlotId)) {
        return NextResponse.json(
          {
            error: `Section has multiple classes scheduled at the same time slot (${entry.timeSlot.startTime}-${entry.timeSlot.endTime})`
          },
          { status: 409 }
        );
      }
      seenSlots.add(entry.timeSlotId);
    }

    // 6. Safe Prisma transaction to update all matching entries to PUBLISHED
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.timetableEntry.updateMany({
        where: {
          sectionId: trimmedSectionId,
          academicYear: trimmedAcademicYear,
          status: "DRAFT"
        },
        data: {
          status: "PUBLISHED"
        }
      });
      return updateResult;
    });

    return NextResponse.json({
      success: true,
      message: "Timetable published successfully",
      sectionId: trimmedSectionId,
      sectionName: section.name,
      academicYear: trimmedAcademicYear,
      publishedCount: result.count
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/timetable/publish ERROR:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while publishing the timetable" },
      { status: 500 }
    );
  }
}
