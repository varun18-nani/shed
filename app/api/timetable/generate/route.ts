import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTimetable } from "@/lib/timetable/generator";
import { scoreTimetable, ScoringEntry } from "@/lib/timetable/scoring";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { departmentId, semester, sectionId, academicYear, preview } = body;

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

    // Fetch related details for scoring & display
    const [subjectsMap, facultyMap, roomsMap, timeSlotsMap] = await Promise.all([
      prisma.subject.findMany({ where: { departmentId, semester: semesterNum } }),
      prisma.faculty.findMany({
        where: { departmentId },
        include: { user: { select: { firstName: true, lastName: true } } }
      }),
      prisma.room.findMany(),
      prisma.timeSlot.findMany()
    ]);

    const sMap = new Map(subjectsMap.map(s => [s.id, s]));
    const fMap = new Map(facultyMap.map(f => [f.id, f]));
    const rMap = new Map(roomsMap.map(r => [r.id, r]));
    const tMap = new Map(timeSlotsMap.map(t => [t.id, t]));

    // Prepare scoring entries
    const scoringEntries: ScoringEntry[] = generatorResult.entries.map((entry) => {
      const slot = tMap.get(entry.timeSlotId);
      const room = rMap.get(entry.roomId);
      const subject = sMap.get(entry.subjectId);
      return {
        subjectId: entry.subjectId,
        subjectName: subject?.name,
        facultyId: entry.facultyId,
        roomId: entry.roomId,
        timeSlotId: entry.timeSlotId,
        dayOfWeek: slot ? slot.dayOfWeek : 1,
        startTime: slot ? slot.startTime : "09:00",
        endTime: slot ? slot.endTime : "10:00",
        roomCapacity: room?.capacity,
        sectionCapacity: section.capacity || undefined
      };
    });

    const qualityAssessment = scoreTimetable(scoringEntries);

    // Format entries for preview / response
    const formattedEntries = generatorResult.entries.map((entry) => {
      const subject = sMap.get(entry.subjectId);
      const faculty = fMap.get(entry.facultyId);
      const room = rMap.get(entry.roomId);
      const slot = tMap.get(entry.timeSlotId);

      return {
        id: `preview_${entry.timeSlotId}_${entry.subjectId}`,
        subjectId: entry.subjectId,
        facultyId: entry.facultyId,
        roomId: entry.roomId,
        timeSlotId: entry.timeSlotId,
        sectionId: entry.sectionId,
        academicYear: entry.academicYear,
        status: "DRAFT",
        subject: { code: subject?.code || "", name: subject?.name || "", credits: subject?.credits || 0 },
        faculty: {
          id: entry.facultyId,
          employeeId: faculty?.employeeId || "",
          user: { firstName: faculty?.user.firstName || "", lastName: faculty?.user.lastName || "" }
        },
        room: { id: entry.roomId, roomNumber: room?.roomNumber || "", building: room?.building || "", type: room?.type || "CLASSROOM" },
        timeSlot: { id: entry.timeSlotId, dayOfWeek: slot?.dayOfWeek || 1, startTime: slot?.startTime || "", endTime: slot?.endTime || "" }
      };
    });

    // 4. Handle Preview Mode (Do NOT write to database)
    if (preview === true) {
      return NextResponse.json({
        success: true,
        preview: true,
        message: "Timetable preview generated successfully.",
        sectionId,
        academicYear,
        entriesCount: formattedEntries.length,
        qualityScore: qualityAssessment.qualityScore,
        qualityBreakdown: qualityAssessment.breakdown,
        recommendations: qualityAssessment.recommendations,
        entries: formattedEntries
      }, { status: 200 });
    }

    // 5. Database Transaction (Save as DRAFT)
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
        await tx.timetableEntry.createMany({ data: entriesToCreate });

        return tx.timetableEntry.findMany({
          where: { sectionId, academicYear },
          include: {
            subject: { select: { code: true, name: true, credits: true } },
            faculty: { select: { id: true, employeeId: true, user: { select: { firstName: true, lastName: true } } } },
            room: { select: { id: true, roomNumber: true, building: true, type: true } },
            timeSlot: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true } }
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
      preview: false,
      message: "Timetable generated successfully.",
      sectionId,
      academicYear,
      entriesCreated: createdEntries.length,
      qualityScore: qualityAssessment.qualityScore,
      qualityBreakdown: qualityAssessment.breakdown,
      recommendations: qualityAssessment.recommendations,
      entries: createdEntries
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/timetable/generate ERROR:", error);
    return NextResponse.json({ error: "An unexpected error occurred during generation." }, { status: 500 });
  }
}
