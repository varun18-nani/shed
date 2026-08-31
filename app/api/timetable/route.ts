import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// HELPER: VALIDATE TIMETABLE ENTRY
// ============================================================
async function validateEntry(data: any, excludeId: string | null = null) {
  // Check existence
  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
  if (!subject) return { error: "Subject not found", status: 404 };

  const faculty = await prisma.faculty.findUnique({ where: { id: data.facultyId } });
  if (!faculty) return { error: "Faculty not found", status: 404 };

  const room = await prisma.room.findUnique({ where: { id: data.roomId } });
  if (!room) return { error: "Room not found", status: 404 };

  const timeSlot = await prisma.timeSlot.findUnique({ where: { id: data.timeSlotId } });
  if (!timeSlot) return { error: "Time slot not found", status: 404 };

  let section = null;
  if (data.sectionId) {
    section = await prisma.section.findUnique({ where: { id: data.sectionId } });
    if (!section) return { error: "Section not found", status: 404 };
  }
  
  let student = null;
  if (data.studentId) {
    student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) return { error: "Student not found", status: 404 };
  }

  // Room availability
  if (room.status === "MAINTENANCE" || room.status === "UNAVAILABLE") {
    return { error: "Selected room is not available for scheduling", status: 409 };
  }

  // Department validation
  if (subject.departmentId !== faculty.departmentId) {
    return { error: "Selected faculty does not belong to the subject's department", status: 400 };
  }
  
  if (section && subject.departmentId !== section.departmentId) {
    return { error: "Selected section does not belong to the subject's department", status: 400 };
  }

  // Conflict detection
  const conflictWhere = {
    timeSlotId: data.timeSlotId,
    academicYear: data.academicYear,
    ...(excludeId ? { id: { not: excludeId } } : {})
  };

  // 1. Faculty conflict
  const facultyConflict = await prisma.timetableEntry.findFirst({
    where: { ...conflictWhere, facultyId: data.facultyId }
  });
  if (facultyConflict) return { error: "Faculty already has a class scheduled during this time slot", status: 409 };

  // 2. Room conflict
  const roomConflict = await prisma.timetableEntry.findFirst({
    where: { ...conflictWhere, roomId: data.roomId }
  });
  if (roomConflict) return { error: "Room is already occupied during this time slot", status: 409 };

  // 3. Section conflict
  if (data.sectionId) {
    const sectionConflict = await prisma.timetableEntry.findFirst({
      where: { ...conflictWhere, sectionId: data.sectionId }
    });
    if (sectionConflict) return { error: "Section already has a class scheduled during this time slot", status: 409 };
  }

  // 4. Student conflict
  if (data.studentId) {
    const studentConflict = await prisma.timetableEntry.findFirst({
      where: { ...conflictWhere, studentId: data.studentId }
    });
    if (studentConflict) return { error: "Student already has a class scheduled during this time slot", status: 409 };
  }

  return null;
}

// ============================================================
// GET
// ============================================================
export async function GET() {
  try {
    const entries = await prisma.timetableEntry.findMany({
      include: {
        subject: true,
        faculty: { include: { user: true } },
        room: true,
        timeSlot: true,
        section: { include: { department: true } },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } }
      ]
    });

    const formatted = entries.map((e) => ({
      id: e.id,
      subject: {
        id: e.subject.id,
        code: e.subject.code,
        name: e.subject.name,
        credits: e.subject.credits,
      },
      faculty: {
        id: e.faculty.id,
        employeeId: e.faculty.employeeId,
        firstName: e.faculty.user.firstName,
        lastName: e.faculty.user.lastName,
      },
      room: {
        id: e.room.id,
        roomNumber: e.room.roomNumber,
        building: e.room.building,
        type: e.room.type,
        capacity: e.room.capacity,
        status: e.room.status,
      },
      timeSlot: {
        id: e.timeSlot.id,
        dayOfWeek: e.timeSlot.dayOfWeek,
        startTime: e.timeSlot.startTime,
        endTime: e.timeSlot.endTime,
      },
      section: e.section
        ? {
            id: e.section.id,
            name: e.section.name,
            semester: e.section.semester,
            department: e.section.department.name,
          }
        : null,
      status: e.status,
      academicYear: e.academicYear,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/timetable ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch timetable entries" }, { status: 500 });
  }
}

// ============================================================
// POST
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      subjectId,
      facultyId,
      roomId,
      timeSlotId,
      sectionId,
      studentId,
      academicYear,
      status
    } = body;

    if (!subjectId || !facultyId || !roomId || !timeSlotId || !academicYear) {
      return NextResponse.json(
        { error: "Subject, Faculty, Room, TimeSlot, and Academic Year are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
    const entryStatus = status && validStatuses.includes(status) ? status : "DRAFT";

    const data = {
      subjectId,
      facultyId,
      roomId,
      timeSlotId,
      sectionId: sectionId || null,
      studentId: studentId || null,
      academicYear,
    };

    const validationError = await validateEntry(data);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const newEntry = await prisma.timetableEntry.create({
      data: {
        ...data,
        status: entryStatus,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable ERROR:", error);
    return NextResponse.json({ error: "Failed to create timetable entry" }, { status: 500 });
  }
}

// ============================================================
// PUT
// ============================================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      subjectId,
      facultyId,
      roomId,
      timeSlotId,
      sectionId,
      studentId,
      academicYear,
      status
    } = body;

    if (!id || !subjectId || !facultyId || !roomId || !timeSlotId || !academicYear) {
      return NextResponse.json(
        { error: "ID, Subject, Faculty, Room, TimeSlot, and Academic Year are required" },
        { status: 400 }
      );
    }

    const existingEntry = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!existingEntry) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
    const entryStatus = status && validStatuses.includes(status) ? status : "DRAFT";

    const data = {
      subjectId,
      facultyId,
      roomId,
      timeSlotId,
      sectionId: sectionId || null,
      studentId: studentId || null,
      academicYear,
    };

    const validationError = await validateEntry(data, id);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const updatedEntry = await prisma.timetableEntry.update({
      where: { id },
      data: {
        ...data,
        status: entryStatus,
      },
    });

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("PUT /api/timetable ERROR:", error);
    return NextResponse.json({ error: "Failed to update timetable entry" }, { status: 500 });
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Timetable Entry ID is required" }, { status: 400 });
    }

    const entry = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    await prisma.timetableEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/timetable ERROR:", error);
    return NextResponse.json({ error: "Failed to delete timetable entry" }, { status: 500 });
  }
}
