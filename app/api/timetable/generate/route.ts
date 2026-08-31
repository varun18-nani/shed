import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTimetable } from "@/lib/timetable/generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { departmentId, semester, sectionId, academicYear } = body;

    // 1. Validate inputs
    if (!departmentId || !semester || !sectionId || !academicYear) {
      return NextResponse.json(
        { error: "departmentId, semester, sectionId, and academicYear are required." },
        { status: 400 }
      );
    }

    const semesterNum = Number(semester);
    if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return NextResponse.json(
        { error: "semester must be an integer between 1 and 8." },
        { status: 400 }
      );
    }

    if (typeof academicYear !== "string" || academicYear.trim() === "") {
      return NextResponse.json(
        { error: "academicYear must be a non-empty string." },
        { status: 400 }
      );
    }

    // Verify Department
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      return NextResponse.json({ error: "Department not found." }, { status: 404 });
    }

    // Verify Section
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    if (section.departmentId !== departmentId) {
      return NextResponse.json({ error: "Section does not belong to the selected department." }, { status: 409 });
    }

    if (section.semester !== semesterNum) {
      return NextResponse.json({ error: "Section does not match the selected semester." }, { status: 409 });
    }

    // 2. Existing Timetable Protection
    const existingEntries = await prisma.timetableEntry.findMany({
      where: {
        sectionId,
        academicYear,
      }
    });

    if (existingEntries.length > 0) {
      return NextResponse.json({
        error: "A timetable already exists for this section and academic year.",
        sectionId,
        academicYear,
        existingEntries: existingEntries.length
      }, { status: 409 });
    }

    // 3. Call Generator
    const generatorResult = await generateTimetable({
      departmentId,
      semester: semesterNum,
      sectionId,
      academicYear,
    });

    if (!generatorResult.success || !generatorResult.entries) {
      return NextResponse.json({
        success: false,
        error: "Unable to generate a complete timetable.",
        diagnostics: generatorResult.diagnostics
      }, { status: 409 });
    }

    // 4. Database Transaction
    const entriesToCreate = generatorResult.entries.map((entry) => ({
      subjectId: entry.subjectId,
      facultyId: entry.facultyId,
      roomId: entry.roomId,
      timeSlotId: entry.timeSlotId,
      sectionId: entry.sectionId,
      studentId: null,
      status: "DRAFT" as const,
      academicYear: entry.academicYear,
    }));

    let createdEntries;
    try {
      createdEntries = await prisma.$transaction(async (tx) => {
        // Use createMany for efficiency, then fetch back with includes
        await tx.timetableEntry.createMany({ data: entriesToCreate });

        return tx.timetableEntry.findMany({
          where: { sectionId, academicYear },
          include: {
            subject: { select: { code: true, name: true } },
            faculty: { select: { user: { select: { firstName: true, lastName: true } } } },
            room: { select: { roomNumber: true } },
            timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } }
          },
          orderBy: [
            { timeSlot: { dayOfWeek: "asc" } },
            { timeSlot: { startTime: "asc" } }
          ]
        });
      }, { timeout: 30000 });
    } catch (txError) {
      console.error("Transaction failed during generation:", txError);
      return NextResponse.json({ error: "Failed to save the generated timetable." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Timetable generated successfully.",
      sectionId,
      academicYear,
      entriesCreated: createdEntries.length,
      entries: createdEntries
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/timetable/generate ERROR:", error);
    return NextResponse.json({ error: "An unexpected error occurred during generation." }, { status: 500 });
  }
}
